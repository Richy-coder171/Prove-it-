import { Router } from 'express';
import { z } from 'zod';
import Badge from '../models/Badge.js';
import Score from '../models/Score.js';
import { verifyBadgeSignature } from '../services/badge.js';
import { auth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createBadgeRouter({ BadgeModel = Badge, ScoreModel = Score } = {}) {
  const router = Router();
  router.get('/mine', auth, requireRole('candidate'), asyncHandler(async (req, res) => {
    const badges = await BadgeModel.find({ candidate: req.user.id }).select('verificationId skill level score authenticity issuedAt isPublic showBreakdownPublicly revoked').lean();
    return res.json({ ok: true, data: { badges } });
  }));
  router.get('/:verificationId', validate(z.object({ verificationId: z.string().regex(/^PI-[A-Z2-9]{4}-[A-Z2-9]{4}$/) }).strict(), 'params'), asyncHandler(async (req, res) => {
    const badge = await BadgeModel.findOne({ verificationId: req.params.verificationId, isPublic: true, revoked: false }).select('+signature').populate('candidate', 'fullName slug').populate('challenge', 'title').populate('endorsement', 'text rating');
    if (!badge) return res.status(404).json({ ok: false, error: { message: 'Could not verify this badge', code: 'BADGE_UNVERIFIED' } });
    const verified = verifyBadgeSignature(badge);
    const data = { verified, message: verified ? 'Verified by ProveIt' : 'Could not verify this badge', verificationId: badge.verificationId };
    if (verified) {
      Object.assign(data, { candidate: badge.candidate?.fullName ?? 'ProveIt candidate', profile: badge.candidate?.slug ?? null, challenge: badge.challenge?.title ?? 'ProveIt challenge', skill: badge.skill, level: badge.level, score: badge.score, authenticity: badge.authenticity, issuedAt: badge.issuedAt, attempt: badge.attempt, endorsement: badge.endorsement ? { text: badge.endorsement.text, rating: badge.endorsement.rating } : null });
      if (badge.showBreakdownPublicly) {
        const score = await ScoreModel.findOne({ submission: badge.submission }).lean();
        data.breakdown = score?.criteria.map(({ name, score: points, max, why }) => ({ name, score: points, max, why })) ?? [];
      }
    }
    return res.json({ ok: true, data });
  }));
  router.patch('/:verificationId/visibility', auth, requireRole('candidate'), validate(z.object({ verificationId: z.string().regex(/^PI-[A-Z2-9]{4}-[A-Z2-9]{4}$/) }).strict(), 'params'), validate(z.object({ isPublic: z.boolean(), showBreakdownPublicly: z.boolean() }).strict()), asyncHandler(async (req, res) => {
    const badge = await BadgeModel.findOneAndUpdate({ verificationId: req.params.verificationId, candidate: req.user.id }, { $set: req.body }, { new: true });
    if (!badge) return res.status(404).json({ ok: false, error: { message: 'Badge not found', code: 'NOT_FOUND' } });
    return res.json({ ok: true, data: { verificationId: badge.verificationId, isPublic: badge.isPublic, showBreakdownPublicly: badge.showBreakdownPublicly } });
  }));
  return router;
}
export default createBadgeRouter();
