import { Router } from "express";
import { z } from "zod";
import Challenge from "../models/Challenge.js";
import Submission from "../models/Submission.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";

export function createSubmissionRouter({
  SubmissionModel = Submission,
  ChallengeModel = Challenge,
} = {}) {
  const router = Router();
  const idSchema = z
    .object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid submission ID") })
    .strict();
  const startSchema = z
    .object({
      challengeId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid challenge ID"),
    })
    .strict();
  const answerSchema = z
    .object({ answerText: z.string().max(20_000) })
    .strict();
  const integritySchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("blur") }).strict(),
    z
      .object({
        type: z.literal("paste"),
        length: z.number().int().min(0).max(20_000),
      })
      .strict(),
  ]);

  router.post(
    "/start",
    auth,
    requireRole("candidate"),
    validate(startSchema),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findById(req.body.challengeId);
      if (!challenge || challenge.status !== "approved") {
        return res
          .status(404)
          .json({
            ok: false,
            error: {
              message: "This challenge is not available",
              code: "CHALLENGE_UNAVAILABLE",
            },
          });
      }
      const attempts = await SubmissionModel.countDocuments({
        challenge: challenge.id,
        candidate: req.user.id,
      });
      if (attempts >= 3)
        return res
          .status(409)
          .json({
            ok: false,
            error: {
              message: "You have reached the attempt limit for this challenge",
              code: "ATTEMPT_LIMIT",
            },
          });

      const startedAt = new Date();
      const deadlineAt = new Date(
        startedAt.getTime() + challenge.timeLimitMinutes * 60_000,
      );
      let submission;
      try {
        submission = await SubmissionModel.create({
          challenge: challenge.id,
          candidate: req.user.id,
          attempt: attempts + 1,
          status: "in_progress",
          startedAt,
          deadlineAt,
        });
      } catch (error) {
        if (error.code === 11000)
          return res
            .status(409)
            .json({
              ok: false,
              error: {
                message: "An attempt for this challenge is already in progress",
                code: "ATTEMPT_EXISTS",
              },
            });
        throw error;
      }
      return res
        .status(201)
        .json({
          ok: true,
          data: { submission, serverNow: new Date().toISOString() },
        });
    }),
  );

  router.patch(
    "/:id/autosave",
    auth,
    requireRole("candidate"),
    validate(idSchema, "params"),
    validate(answerSchema),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOneAndUpdate(
        {
          _id: req.params.id,
          candidate: req.user.id,
          status: "in_progress",
          deadlineAt: { $gte: new Date(Date.now() - 15_000) },
        },
        { $set: { answerText: req.body.answerText } },
        { new: true, runValidators: true },
      );
      if (!submission)
        return res
          .status(409)
          .json({
            ok: false,
            error: {
              message: "This answer is no longer editable",
              code: "SUBMISSION_LOCKED",
            },
          });
      return res.json({
        ok: true,
        data: { savedAt: new Date().toISOString() },
      });
    }),
  );

  router.post(
    "/:id/submit",
    auth,
    requireRole("candidate"),
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOne({
        _id: req.params.id,
        candidate: req.user.id,
      });
      if (!submission)
        return res
          .status(404)
          .json({
            ok: false,
            error: { message: "Submission not found", code: "NOT_FOUND" },
          });
      if (submission.status !== "in_progress" || submission.submittedAt) {
        return res
          .status(409)
          .json({
            ok: false,
            error: {
              message: "This answer has already been submitted",
              code: "SUBMISSION_LOCKED",
            },
          });
      }
      if (Date.now() > new Date(submission.deadlineAt).getTime() + 15_000) {
        return res
          .status(410)
          .json({
            ok: false,
            error: {
              message: "The challenge deadline has passed",
              code: "DEADLINE_PASSED",
            },
          });
      }
      submission.status = "submitted";
      submission.submittedAt = new Date();
      await submission.save();
      return res.json({
        ok: true,
        data: { submission, serverNow: new Date().toISOString() },
      });
    }),
  );

  router.post(
    "/:id/integrity",
    auth,
    requireRole("candidate"),
    validate(idSchema, "params"),
    validate(integritySchema),
    asyncHandler(async (req, res) => {
      const update =
        req.body.type === "blur"
          ? { $inc: { "integrity.tabBlurCount": 1 } }
          : {
              $push: {
                "integrity.pasteEvents": {
                  at: new Date(),
                  length: req.body.length,
                },
              },
            };
      const submission = await SubmissionModel.findOneAndUpdate(
        { _id: req.params.id, candidate: req.user.id, status: "in_progress" },
        update,
        { new: true },
      );
      if (!submission)
        return res
          .status(409)
          .json({
            ok: false,
            error: {
              message: "This answer is no longer editable",
              code: "SUBMISSION_LOCKED",
            },
          });
      return res.json({ ok: true, data: { recorded: true } });
    }),
  );

  router.get(
    "/:id",
    auth,
    requireRole("candidate"),
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOne({
        _id: req.params.id,
        candidate: req.user.id,
      }).populate(
        "challenge",
        "title mode skill level taskType taskMarkdown timeLimitMinutes status",
      );
      if (!submission)
        return res
          .status(404)
          .json({
            ok: false,
            error: { message: "Submission not found", code: "NOT_FOUND" },
          });
      return res.json({
        ok: true,
        data: { submission, serverNow: new Date().toISOString() },
      });
    }),
  );

  return router;
}

export default createSubmissionRouter();
