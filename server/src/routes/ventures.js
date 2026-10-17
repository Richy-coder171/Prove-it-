import { Router } from "express";
import { z } from "zod";
import Venture from "../models/Venture.js";
import Challenge from "../models/Challenge.js";
import Submission from "../models/Submission.js";
import Badge from "../models/Badge.js";
import { verifyBadgeSignature } from "../services/badge.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";

const id = z.string().regex(/^[a-f\d]{24}$/i);
export function createVentureRouter({
  VentureModel = Venture,
  ChallengeModel = Challenge,
  SubmissionModel = Submission,
  BadgeModel = Badge,
} = {}) {
  const router = Router();
  async function card(venture) {
    const badges = await BadgeModel.find({
      submission: { $in: venture.memberSubmissions },
      isPublic: true,
      revoked: false,
    })
      .select("+signature")
      .populate("candidate", "fullName slug")
      .populate("endorsement", "text rating mentor");
    const members = badges
      .filter((badge) => verifyBadgeSignature(badge))
      .map((badge) => ({
        name: badge.candidate?.fullName ?? "Verified member",
        profile: badge.candidate?.slug ?? null,
        skill: badge.skill,
        score: badge.score,
        badgeUrl: `/badge/${badge.verificationId}`,
        endorsement: badge.endorsement
          ? { text: badge.endorsement.text, rating: badge.endorsement.rating }
          : null,
      }));
    return {
      id: venture.id,
      name: venture.name,
      oneLiner: venture.oneLiner,
      challenge: venture.challenge?.title ?? null,
      members,
      mentorConnected: badges.some(({ endorsement }) => Boolean(endorsement)),
    };
  }
  router.post(
    "/",
    auth,
    requireRole("startup"),
    validate(
      z
        .object({
          challengeId: id,
          name: z.string().trim().min(2).max(120),
          oneLiner: z.string().trim().min(10).max(300),
          submissionIds: z.array(id).min(1).max(10),
        })
        .strict(),
    ),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findOne({
        _id: req.body.challengeId,
        owner: req.user.id,
        mode: "founder",
        status: "approved",
      });
      if (!challenge)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Approved Founder Mode challenge not found",
            code: "NOT_FOUND",
          },
        });
      const family = await ChallengeModel.find({
        $or: [{ _id: challenge.id }, { variantOf: challenge.id }],
      }).select("_id");
      const submissions = await SubmissionModel.find({
        _id: { $in: req.body.submissionIds },
        challenge: { $in: family.map(({ _id }) => _id) },
        status: "graded",
      });
      if (submissions.length !== new Set(req.body.submissionIds).size)
        return res.status(400).json({
          ok: false,
          error: {
            message:
              "Every team member must have a completed, verified submission",
            code: "INVALID_MEMBERS",
          },
        });
      const badges = await BadgeModel.find({
        submission: { $in: submissions.map(({ _id }) => _id) },
        isPublic: true,
        revoked: false,
      })
        .select("+signature")
        .populate("endorsement", "mentor");
      const verified = badges.filter(verifyBadgeSignature);
      if (
        verified.length !== submissions.length ||
        !verified.some(({ endorsement }) => endorsement?.mentor)
      )
        return res.status(400).json({
          ok: false,
          error: {
            message:
              "Add public verified badges and a mentor endorsement before creating the Venture Card",
            code: "VERIFICATION_REQUIRED",
          },
        });
      const venture = await VentureModel.create({
        owner: req.user.id,
        challenge: challenge.id,
        name: req.body.name,
        oneLiner: req.body.oneLiner,
        mentor: verified.find(({ endorsement }) => endorsement?.mentor)
          .endorsement.mentor,
        memberSubmissions: submissions.map(({ _id }) => _id),
      });
      venture.challenge = challenge;
      return res
        .status(201)
        .json({ ok: true, data: { venture: await card(venture) } });
    }),
  );
  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const ventures = await VentureModel.find()
        .populate("challenge", "title")
        .sort({ createdAt: -1 })
        .limit(50);
      return res.json({
        ok: true,
        data: { ventures: await Promise.all(ventures.map(card)) },
      });
    }),
  );
  router.get(
    "/:ventureId",
    validate(z.object({ ventureId: id }).strict(), "params"),
    asyncHandler(async (req, res) => {
      const venture = await VentureModel.findById(
        req.params.ventureId,
      ).populate("challenge", "title");
      if (!venture)
        return res.status(404).json({
          ok: false,
          error: { message: "Venture Card not found", code: "NOT_FOUND" },
        });
      return res.json({ ok: true, data: { venture: await card(venture) } });
    }),
  );
  return router;
}
export default createVentureRouter();
