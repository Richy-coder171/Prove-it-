import { Router } from "express";
import { z } from "zod";
import Submission from "../models/Submission.js";
import ReReview from "../models/ReReview.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export function createReReviewRouter({
  SubmissionModel = Submission,
  ReReviewModel = ReReview,
} = {}) {
  const router = Router();
  const schema = z
    .object({
      submissionId: z.string().regex(/^[a-f\d]{24}$/i),
      reason: z.string().trim().min(8).max(2000),
    })
    .strict();
  router.post(
    "/",
    auth,
    requireRole("candidate"),
    validate(schema),
    asyncHandler(async (req, res) => {
      const submission = await SubmissionModel.findOne({
        _id: req.body.submissionId,
        candidate: req.user.id,
        status: "graded",
      });
      if (!submission)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Graded submission not found",
            code: "NOT_FOUND",
          },
        });
      const existing = await ReReviewModel.findOne({
        submission: submission.id,
        status: "open",
      });
      if (existing)
        return res.status(409).json({
          ok: false,
          error: {
            message: "A human review is already open",
            code: "REREVIEW_EXISTS",
          },
        });
      const review = await ReReviewModel.create({
        submission: submission.id,
        reason: req.body.reason,
        status: "open",
      });
      return res.status(201).json({ ok: true, data: { review } });
    }),
  );
  return router;
}
export default createReReviewRouter();
