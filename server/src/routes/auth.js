import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { auth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";

export function createAuthRouter(UserModel = User) {
  const router = Router();
  const registerSchema = z.object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(128),
    fullName: z.string().trim().min(1).max(120),
    role: z.enum(["startup", "candidate", "mentor"]),
    orgName: z.string().trim().max(160).optional(),
  });
  const loginSchema = z.object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128),
  });

  function sessionCookieOptions() {
    return {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SECURE ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  function publicUser(user) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      orgName: user.orgName ?? null,
      slug: user.slug ?? null,
    };
  }

  function createSession(user) {
    return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  router.post(
    "/register",
    authLimiter,
    validate(registerSchema),
    asyncHandler(async (req, res) => {
      const { email, password, fullName, role, orgName } = req.body;
      const passwordHash = await bcrypt.hash(password, 10);
      const slug =
        role === "candidate"
          ? `${fullName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 36)}-${Math.random().toString(36).slice(2, 7)}`
          : undefined;
      let user;
      try {
        user = await UserModel.create({
          email,
          passwordHash,
          fullName,
          role,
          ...(orgName ? { orgName } : {}),
          ...(slug ? { slug } : {}),
        });
      } catch (error) {
        if (error.code === 11000)
          return res.status(409).json({
            ok: false,
            error: {
              message: "An account with this email already exists",
              code: "EMAIL_IN_USE",
            },
          });
        throw error;
      }
      res.cookie(
        "proveit_session",
        createSession(user),
        sessionCookieOptions(),
      );
      return res
        .status(201)
        .json({ ok: true, data: { user: publicUser(user) } });
    }),
  );

  router.post(
    "/login",
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const user = await UserModel.findOne({ email: req.body.email }).select(
        "+passwordHash",
      );
      if (
        !user ||
        !(await bcrypt.compare(req.body.password, user.passwordHash))
      ) {
        return res.status(401).json({
          ok: false,
          error: {
            message: "Email or password is incorrect",
            code: "INVALID_CREDENTIALS",
          },
        });
      }
      res.cookie(
        "proveit_session",
        createSession(user),
        sessionCookieOptions(),
      );
      return res.json({ ok: true, data: { user: publicUser(user) } });
    }),
  );

  router.post("/logout", (_req, res) => {
    res.clearCookie("proveit_session", {
      ...sessionCookieOptions(),
      maxAge: undefined,
    });
    return res.json({ ok: true, data: { loggedOut: true } });
  });

  router.get(
    "/me",
    auth,
    asyncHandler(async (req, res) => {
      const user = await UserModel.findById(req.user.id);
      if (!user)
        return res.status(401).json({
          ok: false,
          error: {
            message: "Session expired. Sign in again.",
            code: "INVALID_SESSION",
          },
        });
      return res.json({ ok: true, data: { user: publicUser(user) } });
    }),
  );

  return router;
}

export default createAuthRouter();
