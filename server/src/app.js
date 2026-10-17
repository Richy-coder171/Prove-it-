import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import authRoutes from "./routes/auth.js";
import challengeRoutes from "./routes/challenges.js";
import submissionRoutes from "./routes/submissions.js";
import { env } from "./config/env.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp({
  authRouter = authRoutes,
  challengeRouter = challengeRoutes,
  submissionRouter = submissionRoutes,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  app.use(generalLimiter);

  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, data: { status: "ok" } }),
  );
  app.use("/api/auth", authRouter);
  app.use("/api/challenges", challengeRouter);
  app.use("/api/submissions", submissionRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export default createApp();
