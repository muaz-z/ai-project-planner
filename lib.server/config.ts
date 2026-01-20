import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string(),
  OPENAI_MODEL: z.enum(["gpt-3.5-turbo", "gpt-4", "gpt-4o", "gpt-4o-mini"]),
});

export function getConfig() {
  const env = envSchema.safeParse(process.env);

  if (!env.success) {
    throw new Error(`Invalid environment variables: ${env.error.message}`);
  }

  return {
    OPENAI_API_KEY: env.data.OPENAI_API_KEY,
    OPENAI_MODEL: env.data.OPENAI_MODEL,
  };
}
