import jwt from 'jsonwebtoken';
import Badge from '../models/Badge.js';
import { env } from '../config/env.js';
import { generateVerificationId } from './verificationId.js';

function payloadFor(badge) {
  const referenceId = (value) => String(value?._id ?? value);
  return {
    vid: badge.verificationId,
    candidateId: referenceId(badge.candidate),
    skill: badge.skill,
    level: badge.level,
    score: badge.score,
    authenticity: badge.authenticity,
    issuedAt: new Date(badge.issuedAt).toISOString(),
    challengeId: referenceId(badge.challenge),
    attempt: badge.attempt,
  };
}

export function signBadge(badge, secret = env.BADGE_SIGNING_SECRET) {
  return jwt.sign(payloadFor(badge), secret, { algorithm: 'HS256' });
}

export function verifyBadgeSignature(badge, secret = env.BADGE_SIGNING_SECRET) {
  try {
    const payload = jwt.verify(badge.signature, secret, { algorithms: ['HS256'] });
    return Object.entries(payloadFor(badge)).every(([key, value]) => payload[key] === value);
  } catch { return false; }
}

export async function issueBadge({ submission, challenge, score, BadgeModel = Badge }) {
  const existing = await BadgeModel.findOne({ submission: submission.id });
  if (existing) return existing;
  const badgeData = {
    verificationId: generateVerificationId(), candidate: submission.candidate, submission: submission.id,
    challenge: challenge.id, skill: challenge.skill, level: challenge.level,
    score: score.finalTotal ?? score.total, authenticity: score.authenticity,
    issuedAt: new Date(), attempt: submission.attempt, isPublic: true,
  };
  badgeData.signature = signBadge(badgeData);
  try { return await BadgeModel.create(badgeData); }
  catch (error) {
    if (error.code === 11000 && error.keyPattern?.submission) return BadgeModel.findOne({ submission: submission.id });
    if (error.code === 11000) return issueBadge({ submission, challenge, score, BadgeModel });
    throw error;
  }
}

export async function refreshBadgeSignature(badge) {
  badge.signature = signBadge(badge);
  await badge.save();
  return badge;
}
