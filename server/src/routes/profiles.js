import { Router } from "express";
import { z } from "zod";
import User from "../models/User.js";
import Badge from "../models/Badge.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { validate } from "../middleware/validate.js";

export function createProfileRouter({
  UserModel = User,
  BadgeModel = Badge,
} = {}) {
  const router = Router();
  router.get(
    "/:slug",
    validate(
      z.object({ slug: z.string().regex(/^[a-z0-9-]{3,60}$/) }).strict(),
      "params",
    ),
    asyncHandler(async (req, res) => {
      const user = await UserModel.findOne({
        slug: req.params.slug,
        role: "candidate",
      }).select("fullName slug headline bio skills");
      if (!user)
        return res.status(404).json({
          ok: false,
          error: { message: "Profile not found", code: "NOT_FOUND" },
        });
      const badges = await BadgeModel.find({
        candidate: user.id,
        isPublic: true,
        revoked: false,
      })
        .select(
          "verificationId skill level score authenticity issuedAt attempt",
        )
        .lean();
      return res.json({
        ok: true,
        data: {
          profile: {
            fullName: user.fullName,
            slug: user.slug,
            headline: user.headline,
            bio: user.bio,
            skills: user.skills,
          },
          badges,
        },
      });
    }),
  );
  return router;
}
export default createProfileRouter();
