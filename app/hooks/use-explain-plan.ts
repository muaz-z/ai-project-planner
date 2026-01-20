import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  projectPlanSchema,
  generatePlanPayloadSchema,
} from "@/lib/schema";
import { z } from "zod";
import { AI_CONFIG } from "@/lib/constants";
import { stripMarkdown } from "@/lib/utils";
import { useAbortController } from "@/hooks/use-abort-controller";

type ProjectPlan = z.infer<typeof projectPlanSchema>;
type FormData = z.infer<typeof generatePlanPayloadSchema>;

type ExplanationResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; content: string };

async function callExplainPlanAPI({
  plan,
  query,
  onChunk,
  signal,
}: {
  plan: ProjectPlan;
  query: FormData;
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const response = await fetch("/api/plans/explain", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan, query }),
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to explain plan");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");

  if (!reader) {
    throw new Error("No response body");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      onChunk(chunk);
    }
  }
}

export function useExplainPlan({
  plan,
  query,
}: {
  plan: ProjectPlan;
  query: FormData;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExplanationResult>({ status: "idle" });
  const [lastExplainAt, setLastExplainAt] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { getSignal } = useAbortController();

  // Compute derived values from lastExplainAt and currentTime
  const timeSinceLastExplain = lastExplainAt
    ? currentTime - lastExplainAt
    : Infinity;

  const canExplain = timeSinceLastExplain >= AI_CONFIG.EXPLAIN_COOLDOWN_MS;

  const cooldownSeconds = canExplain
    ? 0
    : Math.ceil((AI_CONFIG.EXPLAIN_COOLDOWN_MS - timeSinceLastExplain) / 1000);

  // Update currentTime during cooldown for live countdown display
  useEffect(() => {
    if (!lastExplainAt || canExplain) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [lastExplainAt, canExplain]);

  const handleExplain = useCallback(async () => {
    // Check cooldown
    if (!canExplain) {
      return; // Still in cooldown period
    }

    // Set cooldown timestamp
    setLastExplainAt(Date.now());

    setIsCollapsed(false);
    setIsLoading(true);
    setResult({ status: "idle" });

    try {
      let accumulatedContent = "";

      await callExplainPlanAPI({
        plan,
        query,
        signal: getSignal(), // Get fresh signal (auto-aborts previous request)
        onChunk: (chunk) => {
          accumulatedContent += chunk;
          setResult({ status: "success", content: accumulatedContent });
        },
      });

      // Clean up markdown formatting after streaming completes
      setResult({
        status: "success",
        content: stripMarkdown(accumulatedContent),
      });
    } catch (err) {
      // Ignore abort errors (component unmounted or new request started)
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setResult({
        status: "error",
        message: "Failed to generate explanation. Please try again.",
      });
      console.error("Error explaining plan:", err);
    } finally {
      setIsLoading(false);
    }
  }, [plan, query, canExplain, getSignal]);

  const handleToggleCollapse = useCallback((open?: boolean) => {
    if (typeof open === "boolean") {
      setIsCollapsed(!open);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, []);

  const handleReset = useCallback(() => {
    setResult({ status: "idle" });
    setIsCollapsed(false);
  }, []);

  // Memoize button label to avoid recalculating on every render
  const buttonLabel = useMemo(() => {
    if (isLoading) {
      return "Generating...";
    }

    const hasExplanation = result.status === "success";

    if (!canExplain && cooldownSeconds > 0) {
      const baseLabel = hasExplanation
        ? "Regenerate Explanation"
        : "Explain with AI";
      return `${baseLabel} (${cooldownSeconds}s)`;
    }

    return hasExplanation ? "Regenerate Explanation" : "Explain with AI";
  }, [isLoading, result.status, canExplain, cooldownSeconds]);

  return {
    isCollapsed,
    isLoading,
    explanation: result.status === "success" ? result.content : "",
    error: result.status === "error" ? result.message : "",
    canExplain,
    buttonLabel,
    handleExplain,
    handleToggleCollapse,
    handleReset,
  };
}
