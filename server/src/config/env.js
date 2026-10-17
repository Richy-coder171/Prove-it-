import 'dotenv/config';
import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}, z.boolean());

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1, 'Set MONGODB_URI in server/.env'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  BADGE_SIGNING_SECRET: z.string().min(32, 'BADGE_SIGNING_SECRET must contain at least 32 characters'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  COOKIE_SECURE: booleanFromEnv,
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().min(1).default('claude-sonnet-5-5'),
  OPENAI_API_KEY: z.string().optional().default(''),
  DEMO_MODE: booleanFromEnv,
  GRADER_RUNS: z.coerce.number().int().min(1).max(5).default(3),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map(({ path, message }) => `  - ${path.join('.')}: ${message}`).join('\n');
  throw new Error(`Invalid server environment:\n${details}`);
}

export const env = Object.freeze(parsed.data);
