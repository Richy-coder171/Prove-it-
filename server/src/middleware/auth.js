import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function auth(req, res, next) {
  const token = req.cookies?.proveit_session;
  if (!token)
    return res
      .status(401)
      .json({
        ok: false,
        error: { message: "Sign in to continue", code: "UNAUTHENTICATED" },
      });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res
      .status(401)
      .json({
        ok: false,
        error: {
          message: "Session expired. Sign in again.",
          code: "INVALID_SESSION",
        },
      });
  }
}

export function optionalAuth(req, _res, next) {
  const token = req.cookies?.proveit_session;
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      req.user = undefined;
    }
  }
  return next();
}
