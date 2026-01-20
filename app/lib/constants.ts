export const MAX_PHASES = 5;
export const MAX_TASKS_PER_PHASE = 5;

export const AI_CONFIG = {
  TEMPERATURE: 0.7,
  EXPLAIN_COOLDOWN_MS: 30_000, // 30 seconds
} as const;

export const RATE_LIMIT = {
  GENERATE_PLAN: {
    MAX: 5,
    WINDOW_MS: 2 * 60 * 1000, // 2 minutes
  },
  EXPLAIN_PLAN: {
    MAX: 10,
    WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  },
} as const;

export const CLEANUP_INTERVAL = 60000; // 1 minute
