import { Router } from "express";
import { z } from "zod";
import Challenge from "../models/Challenge.js";
import Submission from "../models/Submission.js";
import Score from "../models/Score.js";
import Badge from "../models/Badge.js";
import Endorsement from "../models/Endorsement.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export function createMentorRouter({
  ChallengeModel = Challenge,
  SubmissionModel = Submission,
  ScoreModel = Score,
  BadgeModel = Badge,
  EndorsementModel = Endorsement,
} = {}) {
  const router = Router();
  router.get(
    "/queue",
    auth,
    requireRole("mentor"),
    asyncHandler(async (_req, res) => {
      const submissions = await SubmissionModel.find({ status: "graded" })
        .populate("challenge", "title skill mode")
        .lean();
      if (!submissions.length)
        return res.json({ ok: true, data: { challenges: [] } });
      const scores = await ScoreModel.find({
        submission: { $in: submissions.map(({ _id }) => _id) },
      }).lean();
      const scoreMap = new Map(
        scores.map((score) => [String(score.submission), score]),
      );
      const grouped = new Map();
      for (const submission of submissions) {
        const score = scoreMap.get(String(submission._id));
        if (!score) continue;
        const challengeId = String(submission.challenge._id);
        const list = grouped.get(challengeId) ?? {
          challenge: {
            id: challengeId,
            title: submission.challenge.title,
            skill: submission.challenge.skill,
            mode: submission.challenge.mode,
          },
          rows: [],
        };
        list.rows.push({
          submissionId: String(submission._id),
          total: score.finalTotal ?? score.total,
          authenticity: score.authenticity,
          needsHumanReview: score.needsHumanReview,
          summary: score.summary,
          criteria: score.criteria.map(
            ({ id, name, score: points, max, why }) => ({
              id,
              name,
              score: points,
              max,
              why,
            }),
          ),
        });
        grouped.set(challengeId, list);
      }
      const challenges = [...grouped.values()].map((group) => ({
        ...group,
        rows: group.rows
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
          .map((row, index) => ({
            ...row,
            candidateLabel: `Candidate ${String.fromCharCode(65 + index)}`,
          })),
      }));
      return res.json({ ok: true, data: { challenges } });
    }),
  );

  router.post(
    "/endorse",
    auth,
    requireRole("mentor"),
    validate(
      z
        .object({
          submissionId: objectId,
          text: z.string().trim().min(8).max(280),
          rating: z.number().int().min(1).max(5),
        })
        .strict(),
    ),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOne({
        _id: req.body.submissionId,
        status: "graded",
      });
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Reviewed submission not found",
            code: "NOT_FOUND",
          },
        });
      const endorsement = await EndorsementModel.create({
        submission: submission.id,
        mentor: req.user.id,
        text: req.body.text,
        rating: req.body.rating,
      });
      const badge = await BadgeModel.findOneAndUpdate(
        { submission: submission.id },
        { $set: { endorsement: endorsement.id } },
        { new: true },
      );
      return res.status(201).json({
        ok: true,
        data: {
          endorsement: { text: endorsement.text, rating: endorsement.rating },
          badgeUpdated: Boolean(badge),
        },
      });
    }),
  );

  router.post(
    "/idea-feedback",
    auth,
    requireRole("mentor"),
    validate(
      z
        .object({
          challengeId: objectId,
          text: z.string().trim().min(8).max(1000),
        })
        .strict(),
    ),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findOne({
        _id: req.body.challengeId,
        mode: "founder",
        status: "approved",
      });
      if (!challenge)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Founder challenge not found",
            code: "NOT_FOUND",
          },
        });
      challenge.mentorFeedback.push({
        mentor: req.user.id,
        text: req.body.text,
        createdAt: new Date(),
      });
      await challenge.save();
      return res.status(201).json({
        ok: true,
        data: { feedback: { text: req.body.text, createdAt: new Date() } },
      });
    }),
  );
  return router;
}
export default createMentorRouter();
