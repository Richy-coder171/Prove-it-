import { Router } from "express";
import { z } from "zod";
import Submission from "../models/Submission.js";
import Challenge from "../models/Challenge.js";
import Score from "../models/Score.js";
import { generateChallenge } from "../services/ai/challenges.js";
import { callClaudeJSON } from "../services/ai/client.js";
import { SkillGapGuideSchema } from "../services/ai/schemas.js";
import { skillGapPrompt } from "../services/ai/prompts/skillgap.js";
import { aiCacheKey, withFallback } from "../services/ai/cache.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { auth } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";

export function createSkillGapRouter({
  SubmissionModel = Submission,
  ChallengeModel = Challenge,
  ScoreModel = Score,
  challengeGenerator = generateChallenge,
  guideGenerator = callClaudeJSON,
} = {}) {
  const router = Router();
  const idSchema = z
    .object({ submissionId: z.string().regex(/^[a-f\d]{24}$/i) })
    .strict();
  router.post(
    "/:submissionId",
    auth,
    requireRole("candidate"),
    aiLimiter,
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOne({
        _id: req.params.submissionId,
        candidate: req.user.id,
        status: "graded",
      }).populate("challenge");
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Graded submission not found",
            code: "NOT_FOUND",
          },
        });
      const score = await ScoreModel.findOne({ submission: submission.id });
      if (!score)
        return res.status(404).json({
          ok: false,
          error: { message: "Score not found", code: "NOT_FOUND" },
        });
      const criteria = score.criteria
        .map(({ id, name, score: points, max, why }) => ({
          id,
          name,
          score: points,
          max,
          why,
        }))
        .sort((a, b) => a.score / a.max - b.score / b.max);
      const promptInput = {
        criteria: criteria.slice(0, 4),
        challenge: {
          title: submission.challenge.title,
          skill: submission.challenge.skill,
          taskMarkdown: submission.challenge.taskMarkdown,
        },
      };
      const guide = await withFallback(
        aiCacheKey("skillgap", promptInput),
        () =>
          guideGenerator({
            ...skillGapPrompt(promptInput),
            schema: SkillGapGuideSchema,
            maxTokens: 2200,
          }),
        { schema: SkillGapGuideSchema },
      );
      return res.json({
        ok: true,
        data: { guide, retryAvailable: submission.attempt < 3 },
      });
    }),
  );

  router.post(
    "/:submissionId/retry",
    auth,
    requireRole("candidate"),
    aiLimiter,
    validate(idSchema, "params"),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOne({
        _id: req.params.submissionId,
        candidate: req.user.id,
        status: "graded",
      }).populate("challenge");
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Graded submission not found",
            code: "NOT_FOUND",
          },
        });
      const baseId = submission.challenge.variantOf ?? submission.challenge._id;
      const family = await ChallengeModel.find({
        $or: [{ _id: baseId }, { variantOf: baseId }],
      }).select("_id");
      const familyIds = family.map(({ _id }) => _id);
      const count = await SubmissionModel.countDocuments({
        candidate: req.user.id,
        challenge: { $in: familyIds },
      });
      if (count >= 3)
        return res.status(409).json({
          ok: false,
          error: {
            message:
              "You have reached the three-attempt limit for this challenge",
            code: "ATTEMPT_LIMIT",
          },
        });
      const base = await ChallengeModel.findById(baseId);
      if (!base)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Original challenge not found",
            code: "NOT_FOUND",
          },
        });
      const variant = await challengeGenerator({
        owner: base.owner,
        mode: base.mode,
        sourceText: base.sourceText,
        instruction:
          "Create a new variant using the same skill and rubric, different sample data, and one different constraint. Preserve the original rubric criteria and weights.",
      });
      variant.rubric = base.rubric;
      variant.status = "approved";
      variant.approvedAt = new Date();
      variant.variantOf = base._id;
      await variant.save();
      return res.status(201).json({
        ok: true,
        data: {
          challengeId: variant.id,
          url: `/c/${variant.id}`,
          attempt: count + 1,
        },
      });
    }),
  );
  return router;
}
export default createSkillGapRouter();
