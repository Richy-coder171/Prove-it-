import { Router } from "express";
import Opportunity from "../models/Opportunity.js";
import Challenge from "../models/Challenge.js";
import User from "../models/User.js";
import { rankMatches, scoreMatch } from "../services/matching.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

export function createOpportunityRouter({
  OpportunityModel = Opportunity,
  ChallengeModel = Challenge,
  UserModel = User,
} = {}) {
  const router = Router();
  router.get(
    "/match",
    auth,
    requireRole("candidate"),
    asyncHandler(async (req, res) => {
      const [user, opportunities, challenges] = await Promise.all([
        UserModel.findById(req.user.id).select("skills"),
        OpportunityModel.find().lean(),
        ChallengeModel.find({ status: "approved" })
          .populate("owner", "orgName")
          .lean(),
      ]);
      const challengeItems = challenges.map((challenge) => ({
        id: String(challenge._id),
        kind: "challenge",
        title: challenge.title,
        org: challenge.owner?.orgName ?? "ProveIt startup",
        description: challenge.taskMarkdown,
        tags: [...(challenge.suggestedTags ?? []), challenge.skill],
        url: `/c/${challenge._id}`,
      }));
      return res.json({
        ok: true,
        data: {
          opportunities: rankMatches(
            [
              ...opportunities.map((item) => ({
                ...item,
                id: String(item._id),
                url: item.challenge ? `/c/${item.challenge}` : null,
              })),
              ...challengeItems,
            ],
            user?.skills ?? [],
          ),
        },
      });
    }),
  );
  return router;
}

export function createCandidateMatchRouter({
  ChallengeModel = Challenge,
  UserModel = User,
} = {}) {
  const router = Router();
  router.get(
    "/match",
    auth,
    requireRole("startup"),
    validate(
      z.object({ challengeId: z.string().regex(/^[a-f\d]{24}$/i) }).strict(),
      "query",
    ),
    asyncHandler(async (req, res) => {
      const challenge = await ChallengeModel.findOne({
        _id: req.query.challengeId,
        owner: req.user.id,
        status: "approved",
      });
      if (!challenge)
        return res.status(404).json({
          ok: false,
          error: {
            message: "Approved challenge not found",
            code: "NOT_FOUND",
          },
        });
      const candidates = await UserModel.find({ role: "candidate" }).select(
        "fullName slug headline skills",
      );
      const rows = candidates
        .map((candidate) => ({
          candidate: {
            fullName: candidate.fullName,
            slug: candidate.slug,
            headline: candidate.headline,
          },
          ...scoreMatch(candidate.skills, [
            challenge.skill,
            ...(challenge.suggestedTags ?? []),
          ]),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((row) => ({
          ...row,
          whyMatched: row.matches.length
            ? `Skills include ${row.matches.slice(0, 4).join(", ")}.`
            : "Related skills may transfer to this challenge.",
        }));
      return res.json({ ok: true, data: { candidates: rows } });
    }),
  );
  return router;
}

export default createOpportunityRouter();
