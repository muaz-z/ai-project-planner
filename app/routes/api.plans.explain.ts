import { generatePlanPayloadSchema, projectPlanSchema } from "@/lib/schema";
import { AI_CONFIG, RATE_LIMIT } from "@/lib/constants";
import { getConfig } from "lib.server/config";
import { OpenAI } from "openai";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { checkRateLimit, getClientIdentifier } from "lib.server/rate-limit";
import { logger } from "lib.server/logger";

const requestSchema = z.object({
  query: generatePlanPayloadSchema,
  plan: projectPlanSchema,
});

export async function action({ request }: ActionFunctionArgs) {
  const requestId = uuidv4();
  logger.debug(`[api.plans.explain:${requestId}] Received request`);

  // Check rate limit
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(
    clientId,
    RATE_LIMIT.EXPLAIN_PLAN.MAX,
    RATE_LIMIT.EXPLAIN_PLAN.WINDOW_MS,
  );

  if (!rateLimit.allowed) {
    logger.warn(
      `[api.plans.explain:${requestId}] Rate limit exceeded for client:`,
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
          "X-RateLimit-Limit": String(RATE_LIMIT.EXPLAIN_PLAN.MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)),
        },
      },
    );
  }

  logger.debug(`[api.plans.explain:${requestId}] Rate limit check passed:`, {
    remaining: rateLimit.remaining,
    resetIn: rateLimit.resetIn,
  });

  if (request.method !== "POST") {
    logger.warn(
      `[api.plans.explain:${requestId}] Method not allowed:`,
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
    const payload = await request.json();
    logger.debug(`[api.plans.explain:${requestId}] Parsing request payload`);

    const validatedData = requestSchema.parse(payload);
    logger.debug(`[api.plans.explain:${requestId}] Validation successful`, {
      goal: validatedData.plan.goal,
      phaseCount: validatedData.plan.phases.length,
      experienceLevel: validatedData.query.experienceLevel,
    });

    const prompt = `
    You are an AI project mentor.

    User original query: "${JSON.stringify(validatedData.query, null, 2)}"

    Here is the generated project plan in JSON format:
    ${JSON.stringify(validatedData.plan, null, 2)}

    Your task:

    1. Summarize the overall project plan in a concise and actionable way.
    2. Explain the reasoning behind the order of the phases.
    3. Provide guidance on how the user should approach execution.
    4. Give tips tailored to the user's experience level.
    5. Keep it simple, clear, and under 150 words.
    6. Return plain text only — do NOT include JSON, markdown, or extra formatting. (Important)
    `;

    logger.debug(`[api.plans.explain:${requestId}] Calling OpenAI API`, {
      model: OPENAI_MODEL,
      temperature: AI_CONFIG.TEMPERATURE,
      stream: true,
    });

    const startTime = Date.now();
    const stream = await client.responses.create({
      model: OPENAI_MODEL,
      input: prompt,
      instructions: "You are a helpful project planner AI.",
      temperature: AI_CONFIG.TEMPERATURE,
      stream: true,
    });

    logger.debug(
      `[api.plans.explain:${requestId}] OpenAI stream initiated, preparing to send to client...`,
    );

    // Create a ReadableStream to pipe OpenAI chunks to the client
    const encoder = new TextEncoder();
    let chunkCount = 0;
    let totalLength = 0;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          logger.debug(
            `[api.plans.explain:${requestId}] Starting stream transmission`,
          );

          for await (const chunk of stream) {
            // For Responses API, check for text delta events
            if (chunk.type === "response.output_text.delta") {
              const content = chunk.delta;
              if (content) {
                chunkCount++;
                totalLength += content.length;
                controller.enqueue(encoder.encode(content));

                // Log every 10 chunks to avoid spam
                if (chunkCount % 10 === 0) {
                  logger.debug(
                    `[api.plans.explain:${requestId}] Streamed ${chunkCount} chunks (${totalLength} chars)`,
                  );
                }
              }
            }
          }

          const duration = Date.now() - startTime;
          logger.info(`[api.plans.explain:${requestId}] Stream completed`, {
            chunkCount,
            totalLength,
            durationMs: duration,
          });

          controller.close();
        } catch (error) {
          logger.error(`[api.plans.explain:${requestId}] Stream error:`, error);
          controller.error(error);
        }
      },
    });

    logger.debug(
      `[api.plans.explain:${requestId}] Returning streaming response to client`,
    );

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error(`[api.plans.explain:${requestId}] Error:`, error);

    if (error instanceof z.ZodError) {
      logger.warn(
        `[api.plans.explain:${requestId}] Validation failed:`,
        error.issues,
      );
      return data(
        {
          success: false,
          message: "Invalid request data",
          errors: error.issues,
        },
        { status: 400 },
      );
    }

    logger.error(
      `[api.plans.explain:${requestId}] Unexpected error, returning 500`,
    );
    return data(
      { success: false, message: "Failed to explain plan" },
      { status: 500 },
    );
  }
}
