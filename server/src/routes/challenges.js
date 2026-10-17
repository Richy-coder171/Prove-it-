import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Challenge from "../models/Challenge.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { auth, optionalAuth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { generateChallenge } from "../services/ai/challenges.js";
import {
  ChallengeGenerationInputSchema,
  ChallengeUpdateSchema,
} from "../services/ai/schemas.js";

export function createChallengeRouter({
  ChallengeModel = Challenge,
  generateChallengeFn = generateChallenge,
} = {}) {
  const router = Router();
  const idSchema = {
    safeParse: (value) =>
      mongoose.isValidObjectId(value.id)
        ? { success: true, data: value }
        : {
            success: false,
            error: {
              issues: [{ path: ["id"], message: "Invalid challenge ID" }],
            },
          },
  };
  const regenerateSchema = z
    .object({ instruction: z.string().trim().max(1000).optional() })
    .strict();

  function isOwner(challenge, user) {
    return user?.role === "startup" && challenge.owner.toString() === user.id;
  }

  function publicChallenge(challenge) {
    return {
      id: challenge.id,
      mode: challenge.mode,
      title: challenge.title,
      skill: challenge.skill,
      level: challenge.level,
      taskType: challenge.taskType,
      taskMarkdown: challenge.taskMarkdown,
      timeLimitMinutes: challenge.timeLimitMinutes,
      status: challenge.status,
      rubric: {
        criteria: challenge.rubric.criteria.map(
          ({ id, name, description }) => ({ id, name, description }),
        ),
      },
    };
  }

  router.post(
    "/generate",
    auth,
    requireRole("startup"),
    aiLimiter,
    validate(ChallengeGenerationInputSchema),
    asyncHandler(async (req, res) => {
      const challenge = await generateChallengeFn({
        owner: req.user.id,
        ...req.body,
      });
      return res.status(201).json({ ok: true, data: { challenge } });
    }),
  );

  router.get(
    "/:id",
    optionalAuth,
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findById(req.params.id);
      if (!challenge)
        return res.status(404).json({
          ok: false,
          error: { message: "Challenge not found", code: "NOT_FOUND" },
        });
      if (isOwner(challenge, req.user))
        return res.json({ ok: true, data: { challenge } });
      if (challenge.status === "approved")
        return res.json({
          ok: true,
          data: { challenge: publicChallenge(challenge) },
        });
      return res.status(404).json({
        ok: false,
        error: { message: "Challenge not found", code: "NOT_FOUND" },
      });
    }),
  );

  router.patch(
    "/:id",
    auth,
    requireRole("startup"),
    validate(idSchema, "params"),
    validate(ChallengeUpdateSchema),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findOneAndUpdate(
        { _id: req.params.id, owner: req.user.id, status: "draft" },
        req.body,
        { new: true, runValidators: true },
      );
      if (!challenge)
        return res.status(404).json({
          ok: false,
          error: { message: "Draft challenge not found", code: "NOT_FOUND" },
        });
      return res.json({ ok: true, data: { challenge } });
    }),
  );

  router.post(
    "/:id/approve",
    auth,
    requireRole("startup"),
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findOne({
        _id: req.params.id,
        owner: req.user.id,
        status: "draft",
      });
      if (!challenge)
        return res.status(404).json({
          ok: false,
          error: { message: "Draft challenge not found", code: "NOT_FOUND" },
        });
      const weightTotal = challenge.rubric.criteria.reduce(
        (total, criterion) => total + criterion.weight,
        0,
      );
      if (Math.round(weightTotal * 100) / 100 !== 100)
        return res.status(400).json({
          ok: false,
          error: {
            message: "Rubric weights must sum to 100 before approval",
            code: "INVALID_RUBRIC",
          },
        });
      challenge.status = "approved";
      challenge.approvedAt = new Date();
      await challenge.save();
      return res.json({ ok: true, data: { challenge } });
    }),
  );

  router.post(
    "/:id/regenerate",
    auth,
    requireRole("startup"),
    aiLimiter,
    validate(idSchema, "params"),
    validate(regenerateSchema),
    asyncHandler(async (req, res) => {
      const current = await ChallengeModel.findOne({
        _id: req.params.id,
        owner: req.user.id,
        status: "draft",
      });
      if (!current)
        return res.status(404).json({
          ok: false,
          error: { message: "Draft challenge not found", code: "NOT_FOUND" },
        });
      const replacement = await generateChallengeFn({
        owner: req.user.id,
        mode: current.mode,
        sourceText: current.sourceText,
        instruction: req.body.instruction,
      });
      return res
        .status(201)
        .json({ ok: true, data: { challenge: replacement } });
    }),
  );

  return router;
}

export default createChallengeRouter();
