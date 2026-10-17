import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { createSubmissionRouter } from "../src/routes/submissions.js";

const challengeId = "507f1f77bcf86cd799439011";
const submissionId = "507f1f77bcf86cd799439012";

function makeSubmission(overrides = {}) {
  return {
    id: submissionId,
    challenge: challengeId,
    candidate: "candidate-1",
    attempt: 1,
    status: "in_progress",
    startedAt: new Date(),
    deadlineAt: new Date(Date.now() + 60_000),
    answerText: "",
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("candidate submission flow", () => {
  let SubmissionModel;
  let ChallengeModel;
  let app;
  const candidateCookie = () =>
    `proveit_session=${jwt.sign({ sub: "candidate-1", role: "candidate" }, env.JWT_SECRET)}`;

  beforeEach(() => {
    SubmissionModel = {
      create: vi.fn(),
      countDocuments: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
    };
    ChallengeModel = { findById: vi.fn() };
    app = createApp({
      submissionRouter: createSubmissionRouter({
        SubmissionModel,
        ChallengeModel,
      }),
    });
  });

  it("starts only an approved challenge and calculates the deadline on the server", async () => {
    ChallengeModel.findById.mockResolvedValue({
      id: challengeId,
      status: "approved",
      timeLimitMinutes: 30,
    });
    SubmissionModel.countDocuments.mockResolvedValue(0);
    SubmissionModel.create.mockImplementation(async (value) => ({
      id: submissionId,
      ...value,
    }));

    const response = await request(app)
      .post("/api/submissions/start")
      .set("Cookie", candidateCookie())
      .send({ challengeId });

    expect(response.status).toBe(201);
    expect(
      new Date(response.body.data.submission.deadlineAt).getTime() -
        new Date(response.body.data.submission.startedAt).getTime(),
    ).toBe(30 * 60_000);
    expect(SubmissionModel.create.mock.calls[0][0]).toMatchObject({
      candidate: "candidate-1",
      attempt: 1,
      status: "in_progress",
    });
  });

  it("blocks attempts after the three-attempt limit", async () => {
    ChallengeModel.findById.mockResolvedValue({
      id: challengeId,
      status: "approved",
      timeLimitMinutes: 30,
    });
    SubmissionModel.countDocuments.mockResolvedValue(3);

    const response = await request(app)
      .post("/api/submissions/start")
      .set("Cookie", candidateCookie())
      .send({ challengeId });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ATTEMPT_LIMIT");
    expect(SubmissionModel.create).not.toHaveBeenCalled();
  });

  it("autosaves only the candidate’s own in-progress answer", async () => {
    SubmissionModel.findOneAndUpdate.mockResolvedValue({ id: submissionId });

    const response = await request(app)
      .patch(`/api/submissions/${submissionId}/autosave`)
      .set("Cookie", candidateCookie())
      .send({ answerText: "I would inspect the delay by region first." });

    expect(response.status).toBe(200);
    expect(SubmissionModel.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      _id: submissionId,
      candidate: "candidate-1",
      status: "in_progress",
    });
    expect(
      SubmissionModel.findOneAndUpdate.mock.calls[0][1].$set.answerText,
    ).toContain("region");
  });

  it("locks and timestamps the submitted answer", async () => {
    const submission = makeSubmission();
    SubmissionModel.findOne.mockResolvedValue(submission);

    const response = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set("Cookie", candidateCookie());

    expect(response.status).toBe(200);
    expect(submission.status).toBe("submitted");
    expect(submission.submittedAt).toBeInstanceOf(Date);
    expect(submission.save).toHaveBeenCalledOnce();
  });

  it("does not expose another candidate’s submission", async () => {
    SubmissionModel.findOne.mockReturnValue({
      populate: vi.fn().mockResolvedValue(null),
    });

    const response = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set("Cookie", candidateCookie());

    expect(response.status).toBe(404);
    expect(SubmissionModel.findOne).toHaveBeenCalledWith({
      _id: submissionId,
      candidate: "candidate-1",
    });
  });
});
