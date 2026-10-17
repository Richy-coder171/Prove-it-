import { Router } from "express";
import { z } from "zod";
import Challenge from "../models/Challenge.js";
import Submission from "../models/Submission.js";
import Score from "../models/Score.js";
import Shortlist from "../models/Shortlist.js";
import Badge from "../models/Badge.js";
import { refreshBadgeSignature } from "../services/badge.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const mongoId = z.string().regex(/^[a-f\d]{24}$/i);
export function createStartupRouter({
  ChallengeModel = Challenge,
  SubmissionModel = Submission,
  ScoreModel = Score,
  ShortlistModel = Shortlist,
  BadgeModel = Badge,
} = {}) {
  const router = Router();
  router.get(
    "/challenges/:id/leaderboard",
    auth,
    requireRole("startup"),
    validate(z.object({ id: mongoId }).strict(), "params"),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findOne({
        _id: req.params.id,
        owner: req.user.id,
      });
      if (!challenge)
        return res.status(404).json({
          ok: false,
          error: { message: "Challenge not found", code: "NOT_FOUND" },
        });
      const submissions = await SubmissionModel.find({
        challenge: challenge.id,
        status: "graded",
      })
        .populate("candidate", "fullName slug headline skills")
        .lean();
      const ids = submissions.map(({ _id }) => _id);
      const [scores, shortlists, endorsed] = await Promise.all([
        ScoreModel.find({ submission: { $in: ids } }).lean(),
        ShortlistModel.find({
          challenge: challenge.id,
          submission: { $in: ids },
        }).lean(),
        BadgeModel.find({
          submission: { $in: ids },
          endorsement: { $ne: null },
        })
          .select("submission")
          .lean(),
      ]);
      const scoreById = new Map(
        scores.map((score) => [String(score.submission), score]),
      );
      const shortlistById = new Map(
        shortlists.map((item) => [String(item.submission), item]),
      );
      const endorsedIds = new Set(
        endorsed.map(({ submission }) => String(submission)),
      );
      const rows = submissions.flatMap((submission) => {
        const score = scoreById.get(String(submission._id));
        if (!score) return [];
        const reasoningScore =
          score.criteria.find(({ id }) => id === "reasoning_under_questioning")
            ?.score ?? 0;
        const shortlist = shortlistById.get(String(submission._id));
        return [
          {
            submissionId: String(submission._id),
            candidate: submission.candidate,
            attempt: submission.attempt,
            total: score.finalTotal ?? score.total,
            reasoningScore,
            authenticity: score.authenticity,
            needsHumanReview: score.needsHumanReview,
            mentorEndorsed: endorsedIds.has(String(submission._id)),
            shortlist: shortlist?.status ?? null,
          },
        ];
      });
      rows.sort(
        (a, b) =>
          b.total - a.total ||
          b.reasoningScore - a.reasoningScore ||
          { high: 0, medium: 1, low: 2 }[a.authenticity] -
            { high: 0, medium: 1, low: 2 }[b.authenticity],
      );
      const ranked = rows.map((row, index) => ({ rank: index + 1, ...row }));
      return res.json({
        ok: true,
        data: {
          challenge: {
            id: challenge.id,
            title: challenge.title,
            skill: challenge.skill,
          },
          rows: ranked,
        },
      });
    }),
  );

  router.post(
    "/shortlist",
    auth,
    requireRole("startup"),
    validate(
      z
        .object({
          submissionId: mongoId,
          status: z
            .enum(["shortlisted", "hired", "rejected"])
            .default("shortlisted"),
          note: z.string().trim().max(1000).optional(),
        })
        .strict(),
    ),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findById(
        req.body.submissionId,
      ).populate("challenge", "owner");
      if (
        !submission ||
        String(submission.challenge.owner) !== req.user.id ||
        submission.status !== "graded"
      )
        return res.status(404).json({
          ok: false,
          error: { message: "Candidate result not found", code: "NOT_FOUND" },
        });
      const item = await ShortlistModel.findOneAndUpdate(
        {
          challenge: submission.challenge.id ?? submission.challenge._id,
          submission: submission.id,
        },
        {
          $set: {
            status: req.body.status,
            ...(req.body.note ? { note: req.body.note } : {}),
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
      return res.json({ ok: true, data: { shortlist: item } });
    }),
  );

  router.delete(
    "/shortlist/:submissionId",
    auth,
    requireRole("startup"),
    validate(z.object({ submissionId: mongoId }).strict(), "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findById(
        req.params.submissionId,
      ).populate("challenge", "owner");
      if (!submission || String(submission.challenge.owner) !== req.user.id)
        return res.status(404).json({
          ok: false,
          error: { message: "Candidate result not found", code: "NOT_FOUND" },
        });
      await ShortlistModel.deleteOne({
        challenge: submission.challenge.id ?? submission.challenge._id,
        submission: submission.id,
      });
      return res.json({ ok: true, data: { removed: true } });
    }),
  );

  router.post(
    "/scores/:submissionId/override",
    auth,
    requireRole("startup"),
    validate(z.object({ submissionId: mongoId }).strict(), "params"),
    validate(
      z
        .object({
          criterionId: z.string().min(3).max(60),
          score: z.number().min(0).max(100),
          reason: z.string().trim().min(8).max(1000),
        })
        .strict(),
    ),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findById(
        req.params.submissionId,
      ).populate("challenge", "owner");
      if (!submission || String(submission.challenge.owner) !== req.user.id)
        return res.status(404).json({
          ok: false,
          error: { message: "Candidate result not found", code: "NOT_FOUND" },
        });
      const score = await ScoreModel.findOne({ submission: submission.id });
      if (!score)
        return res.status(404).json({
          ok: false,
          error: { message: "Score not found", code: "NOT_FOUND" },
        });
      const criterion = score.criteria.find(
        ({ id }) => id === req.body.criterionId,
      );
      if (!criterion)
        return res.status(404).json({
          ok: false,
          error: { message: "Rubric criterion not found", code: "NOT_FOUND" },
        });
      if (req.body.score > criterion.max)
        return res.status(400).json({
          ok: false,
          error: {
            message: "Score cannot exceed the criterion maximum",
            code: "INVALID_SCORE",
          },
        });
      score.overrides.push({
        criterionId: criterion.id,
        oldScore:
          score.overrides
            .filter((item) => item.criterionId === criterion.id)
            .at(-1)?.newScore ?? criterion.score,
        newScore: req.body.score,
        reason: req.body.reason,
        by: req.user.id,
        at: new Date(),
      });
      score.finalTotal =
        score.total +
        score.overrides.reduce(
          (sum, item) => sum + (item.newScore - item.oldScore),
          0,
        );
      await score.save();
      const badge = await BadgeModel.findOne({ submission: submission.id });
      if (badge) {
        badge.score = score.finalTotal;
        await refreshBadgeSignature(badge);
      }
      return res.json({
        ok: true,
        data: {
          score: {
            total: score.total,
            finalTotal: score.finalTotal,
            overrides: score.overrides,
          },
        },
      });
    }),
  );
  return router;
}
export default createStartupRouter();
