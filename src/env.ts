import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    GMAIL_FETCH_LIMIT: z.coerce.number().min(1).max(500).default(500),
  },
  client: {},
  runtimeEnv: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    GMAIL_FETCH_LIMIT: process.env.GMAIL_FETCH_LIMIT,
  },
  // Skip validation during build (e.g., in CI)
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
