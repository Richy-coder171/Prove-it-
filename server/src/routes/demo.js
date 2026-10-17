import { Router } from "express";
import { env } from "../config/env.js";
import Badge from "../models/Badge.js";
import Challenge from "../models/Challenge.js";
import Venture from "../models/Venture.js";
import { seedDemoData, DEMO_PASSWORD } from "../../scripts/seed.js";
import { seedDemoCache } from "../../scripts/cacheDemoResponses.js";
import { DEMO_CHALLENGE_PACKAGE } from "../../scripts/demoData.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export function createDemoRouter({
  BadgeModel = Badge,
  ChallengeModel = Challenge,
  VentureModel = Venture,
  reset = async () => {
    await seedDemoData();
    await seedDemoCache();
  },
} = {}) {
  const router = Router();
  router.get(
    "/status",
    asyncHandler(async (_req, res) => {
      if (!env.DEMO_MODE)
        return res.json({ ok: true, data: { enabled: false } });
      const [challenge, badge, venture] = await Promise.all([
        ChallengeModel.findOne({
          title: DEMO_CHALLENGE_PACKAGE.title,
          mode: "hiring",
        }),
        BadgeModel.findOne({}).sort({ createdAt: -1 }),
        VentureModel.findOne({ name: "Fieldnote" }),
      ]);
      return res.json({
        ok: true,
        data: {
          enabled: true,
          challengeId: challenge?.id ?? null,
          sampleBadgeId: badge?.verificationId ?? null,
          ventureId: venture?.id ?? null,
          password: DEMO_PASSWORD,
        },
      });
    }),
  );
  router.post(
    "/reset",
    asyncHandler(async (_req, res) => {
      if (!env.DEMO_MODE)
        return res.status(404).json({
          ok: false,
          error: { message: "Demo mode is not enabled", code: "NOT_FOUND" },
        });
      const data = await reset();
      return res.json({
        ok: true,
        data: {
          reset: true,
          sampleBadgeId: data?.sampleBadgeId ?? null,
          ventureId: data?.venture?.id ?? null,
        },
      });
    }),
  );
  return router;
}
export default createDemoRouter();
