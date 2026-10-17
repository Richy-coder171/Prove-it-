import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { createStartupRouter } from '../src/routes/startup.js';

const challengeId = '507f1f77bcf86cd799439011';
const submissionId = '507f1f77bcf86cd799439012';
const startupCookie = (id = 'startup-1', role = 'startup') => `proveit_session=${jwt.sign({ sub: id, role }, env.JWT_SECRET)}`;

describe('startup result controls', () => {
  let ChallengeModel; let SubmissionModel; let ScoreModel; let ShortlistModel; let BadgeModel; let app;
  beforeEach(() => {
    ChallengeModel = { findOne: vi.fn() };
    SubmissionModel = { find: vi.fn(), findById: vi.fn() };
    ScoreModel = { find: vi.fn(), findOne: vi.fn() };
    ShortlistModel = { find: vi.fn(), findOneAndUpdate: vi.fn(), deleteOne: vi.fn() };
    BadgeModel = { find: vi.fn(), findOne: vi.fn() };
    app = createApp({ startupRouter: createStartupRouter({ ChallengeModel, SubmissionModel, ScoreModel, ShortlistModel, BadgeModel }) });
  });

  it('keeps a challenge leaderboard scoped to its owning startup', async () => {
    ChallengeModel.findOne.mockResolvedValue(null);
    const denied = await request(app).get(`/api/challenges/${challengeId}/leaderboard`).set('Cookie', startupCookie('other-startup'));
    expect(denied.status).toBe(404);
    expect(ChallengeModel.findOne).toHaveBeenCalledWith({ _id: challengeId, owner: 'other-startup' });
  });

  it('records a human override, reason, and recalculated final score', async () => {
    const challenge = { id: challengeId, owner: 'startup-1' };
    const submission = { id: submissionId, challenge };
    SubmissionModel.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue(submission) });
    const score = { submission: submissionId, total: 70, finalTotal: 70, criteria: [{ id: 'reasoning_under_questioning', score: 20, max: 30 }], overrides: [], save: vi.fn().mockResolvedValue(undefined) };
    ScoreModel.findOne.mockResolvedValue(score);
    BadgeModel.findOne.mockResolvedValue(null);

    const response = await request(app).post(`/api/scores/${submissionId}/override`).set('Cookie', startupCookie()).send({ criterionId: 'reasoning_under_questioning', score: 26, reason: 'The transcript gives clear evidence for this choice.' });
    expect(response.status).toBe(200);
    expect(score.finalTotal).toBe(76);
    expect(score.overrides[0]).toMatchObject({ oldScore: 20, newScore: 26, reason: 'The transcript gives clear evidence for this choice.', by: 'startup-1' });
    expect(score.save).toHaveBeenCalledOnce();
  });
});
