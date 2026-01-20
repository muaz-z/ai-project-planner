import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { generatePlanPayloadSchema, projectPlanSchema } from "@/lib/schema";
import { ZodError } from "zod";
import { getConfig } from "lib.server/config";
import OpenAI from "openai";
import { sanitizeString } from "@/lib/utils";
import {
  MAX_PHASES,
  MAX_TASKS_PER_PHASE,
  AI_CONFIG,
  RATE_LIMIT,
} from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";
import { checkRateLimit, getClientIdentifier } from "lib.server/rate-limit";
import { logger } from "lib.server/logger";

export async function action({ request }: ActionFunctionArgs) {
  const requestId = uuidv4();
  logger.debug(`[api.plans.generate:${requestId}] Received request`);

  // Check rate limit
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(
    clientId,
    RATE_LIMIT.GENERATE_PLAN.MAX,
    RATE_LIMIT.GENERATE_PLAN.WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    logger.warn(
      `[api.plans.generate:${requestId}] Rate limit exceeded for client:`,
      clientId,
    );
    return data(
      {
        success: false,
        message: `Too many requests. Please try again in ${rateLimit.resetIn} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.resetIn),
          "X-RateLimit-Limit": String(RATE_LIMIT.GENERATE_PLAN.MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)),
        },
      },
    );
  }

  logger.debug(`[api.plans.generate:${requestId}] Rate limit check passed:`, {
    remaining: rateLimit.remaining,
    resetIn: rateLimit.resetIn,
  });

  if (request.method !== "POST") {
    logger.warn(
      `[api.plans.generate:${requestId}] Method not allowed:`,
      request.method,
    );
    return data(
      { success: false, message: "Method not allowed" },
      { status: 405 },
    );
  }

  const { OPENAI_API_KEY, OPENAI_MODEL } = getConfig();

  const client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    timeout: 30000, // 30 seconds
    maxRetries: 2,
  });

  try {
    // Parse and validate incoming payload
    logger.debug(`[api.plans.generate:${requestId}] Parsing request payload`);
    const payload = await request.json();

    const validatedData = generatePlanPayloadSchema.parse(payload);
    logger.debug(`[api.plans.generate:${requestId}] Validation successful:`, {
      projectGoal: validatedData.projectGoal,
      experienceLevel: validatedData.experienceLevel,
      timeAvailability: validatedData.timeAvailability,
      deadline: validatedData.deadline,
    });

    const sanitizedGoal = sanitizeString(validatedData.projectGoal);
    logger.debug(
      `[api.plans.generate:${requestId}] Sanitized goal:`,
      sanitizedGoal,
    );

    const prompt = `
    You are an AI project planner.

    Input:
    - Raw user goal: "${sanitizedGoal}"
    - Experience level: "${validatedData.experienceLevel}"
    - Time availability: "${validatedData.timeAvailability}"
    - Deadline: "${
      validatedData.deadline
        ? new Date(validatedData.deadline).toISOString()
        : "No deadline"
    }"

    Step 1 — Goal normalization:
    - If the raw user goal is unclear, vague, or gibberish, infer a reasonable and realistic software-related project goal.
    - Rewrite the goal into ONE clear, concise sentence.
    - Use this rewritten goal in the final output.

    Step 2 — Plan generation:
    Generate a project plan that breaks the goal into phases and actionable tasks.
    Output format (STRICT):
    {
      "goal": string,
      "phases": [
        {
          "name": string,
          "serial": number,
          "tasks": [
            {
              "id": number,
              "title": string,
              "status": "not_started",
              "serial": number
            }
          ]
        }
      ]
    }

    Constraints:
    - Maximum ${MAX_PHASES} phases
    - Maximum ${MAX_TASKS_PER_PHASE} tasks per phase
    - All tasks MUST have status "not_started"
    - serial values must start at 1 and increment sequentially
    - id values must be unique integers
    - Return ONLY valid JSON
    - Do NOT include explanations, markdown, comments, or extra text
    `;

    logger.debug(`[api.plans.generate:${requestId}] Calling OpenAI API`, {
      model: OPENAI_MODEL,
      temperature: AI_CONFIG.TEMPERATURE,
    });
    const startTime = Date.now();

    const result = await client.responses.create({
      model: OPENAI_MODEL,
      input: prompt,
      instructions: "You are a helpful project planner AI.",
      temperature: AI_CONFIG.TEMPERATURE,
    });

    const aiResponse = result.output_text;
    const apiDuration = Date.now() - startTime;
    logger.debug(`[api.plans.generate:${requestId}] OpenAI response received`, {
      durationMs: apiDuration,
      hasContent: !!aiResponse,
      contentLength: aiResponse?.length || 0,
    });

    if (!aiResponse) {
      logger.error(
        `[api.plans.generate:${requestId}] AI returned empty response`,
      );
      throw new Error("AI did not return any content");
    }

    // Parse and validate AI response
    logger.debug(
      `[api.plans.generate:${requestId}] Parsing AI response as JSON...`,
    );
    let parsedResponse;
    try {
      // Try direct JSON parse first (fast path - most common case)
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback: AI sometimes wraps JSON in markdown code blocks despite instructions
      // Try stripping markdown wrapper and parsing again
      logger.warn(
        `[api.plans.generate:${requestId}] Direct JSON parse failed, attempting markdown strip...`,
      );

      try {
        const cleanedResponse = aiResponse
          .trim()
          .replace(/^```(?:json)?\s*\n?/, "") // Remove opening ```json or ```
          .replace(/\n?```\s*$/, "") // Remove closing ```
          .trim();

        parsedResponse = JSON.parse(cleanedResponse);
        logger.info(
          `[api.plans.generate:${requestId}] Successfully recovered from markdown-wrapped response`,
        );
      } catch {
        // Both attempts failed - log and throw
        logger.error(
          `[api.plans.generate:${requestId}] Failed to parse AI response as JSON after fallback:`,
          parseError,
        );
        logger.error(
          `[api.plans.generate:${requestId}] Raw AI response:`,
          aiResponse,
        );
        throw new Error(
          `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }
    }

    logger.debug(
      `[api.plans.generate:${requestId}] Validating parsed plan against schema...`,
    );
    const plan = projectPlanSchema.parse(parsedResponse);
    logger.debug(
      `[api.plans.generate:${requestId}] Plan validated successfully:`,
      {
        goal: plan.goal,
        phaseCount: plan.phases.length,
      },
    );

    // Normalize plan structure
    plan.phases = plan.phases.slice(0, MAX_PHASES).map((phase, phaseIndex) => ({
      ...phase,
      serial: phaseIndex + 1,
      tasks: phase.tasks
        .slice(0, MAX_TASKS_PER_PHASE)
        .map((task, taskIndex) => ({
          ...task,
          serial: taskIndex + 1,
          status: "not_started",
        })),
    }));

    logger.debug(`[api.plans.generate:${requestId}] Plan normalized:`, {
      finalPhaseCount: plan.phases.length,
      tasksPerPhase: plan.phases.map((p) => p.tasks.length),
    });

    const totalDuration = Date.now() - startTime;
    logger.info(
      `[api.plans.generate:${requestId}] Successfully generated plan`,
      {
        totalDurationMs: totalDuration,
      },
    );

    return data(plan, { status: 200 });
  } catch (error) {
    logger.error(`[api.plans.generate:${requestId}] Error occurred:`, error);

    // Input validation error
    if (error instanceof ZodError) {
      const isInputValidation = error.issues.some(
        (issue) =>
          issue.path[0] === "projectGoal" ||
          issue.path[0] === "experienceLevel" ||
          issue.path[0] === "timeAvailability" ||
          issue.path[0] === "deadline",
      );

      if (isInputValidation) {
        logger.warn(
          `[api.plans.generate:${requestId}] Input validation failed:`,
          error.issues,
        );
        return data(
          {
            success: false,
            message: "Invalid input data. Please check your form fields.",
            errors: error.issues,
          },
          { status: 400 },
        );
      } else {
        // AI response validation error
        logger.error(
          `[api.plans.generate:${requestId}] AI response validation failed:`,
          error.issues,
        );
        return data(
          {
            success: false,
            message: "AI generated an invalid response. Please try again.",
            errors: error.issues,
          },
          { status: 500 },
        );
      }
    }

    // OpenAI API error
    if (error && typeof error === "object" && "status" in error) {
      const apiError = error as { status?: number; message?: string };
      logger.error(`[api.plans.generate:${requestId}] OpenAI API error:`, {
        status: apiError.status,
        message: apiError.message,
      });
      return data(
        {
          success: false,
          message: `OpenAI API error: ${apiError.message || "Unknown error"}`,
        },
        { status: apiError.status === 429 ? 429 : 500 },
      );
    }

    // Generic error
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `[api.plans.generate:${requestId}] Unexpected error:`,
      errorMessage,
    );

    return data(
      {
        success: false,
        message: `Failed to generate plan: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
