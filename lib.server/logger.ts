/**
 * Server-side logger utility
 *
 * Provides environment-aware logging to reduce noise in production
 * while maintaining full visibility in development.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  /**
   * Debug logs - only shown in development
   * Use for verbose request tracking, data inspection, and flow tracing
   *
   * @example
   * logger.debug("[api] Received request", { userId: 123 });
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info logs - shown in all environments
   * Use for important business events that should be tracked in production
   *
   * @example
   * logger.info("[api] Plan generation completed", { planId: "abc" });
   */
  info: (...args: unknown[]) => {
    console.log(...args);
  },

  /**
   * Warning logs - shown in all environments
   * Use for recoverable issues that need attention
   *
   * @example
   * logger.warn("[api] Rate limit approaching", { remaining: 1 });
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Error logs - shown in all environments
   * Use for failures that require immediate attention
   *
   * @example
   * logger.error("[api] Failed to parse response", error);
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
