import { describe, expect, it, vi } from 'vitest';
import { generateVerificationId } from '../src/services/verificationId.js';
import { issueBadge, signBadge, verifyBadgeSignature } from '../src/services/badge.js';

const sample = () => ({ verificationId: 'PI-ABCD-2345', candidate: 'candidate-1', submission: 'submission-1', challenge: 'challenge-1', skill: 'Data analysis', level: 'Intermediate', score: 82, authenticity: 'high', issuedAt: new Date('2025-01-02T00:00:00.000Z'), attempt: 1 });

describe('signed public badges', () => {
  it('generates a unique-format verification ID and verifies the signed fields', () => {
    const badge = sample(); badge.signature = signBadge(badge);
    expect(generateVerificationId()).toMatch(/^PI-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(verifyBadgeSignature(badge)).toBe(true);
    expect(verifyBadgeSignature({ ...badge, candidate: { _id: 'candidate-1', fullName: 'Candidate' }, challenge: { _id: 'challenge-1', title: 'Challenge' } })).toBe(true);
    expect(verifyBadgeSignature({ ...badge, score: 83 })).toBe(false);
    expect(verifyBadgeSignature({ ...badge, signature: `${badge.signature}x` })).toBe(false);
  });

  it('issues one badge for a graded submission and returns an existing badge idempotently', async () => {
    const badge = sample();
    const BadgeModel = { findOne: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(badge), create: vi.fn().mockResolvedValue(badge) };
    const submission = { id: 'submission-1', candidate: 'candidate-1', attempt: 1 };
    const challenge = { id: 'challenge-1', skill: 'Data analysis', level: 'Intermediate' };
    const score = { total: 82, authenticity: 'high' };
    const issued = await issueBadge({ submission, challenge, score, BadgeModel });
    const again = await issueBadge({ submission, challenge, score, BadgeModel });
    expect(issued.verificationId).toMatch(/^PI-/);
    expect(BadgeModel.create).toHaveBeenCalledOnce();
    expect(again).toBe(badge);
  });
});
