import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { createChallengeRouter } from "../src/routes/challenges.js";
import {
  ChallengePackageSchema,
  RubricSchema,
} from "../src/services/ai/schemas.js";

const challengeId = "507f1f77bcf86cd799439011";
const packageData = {
  title: "Investigate an order delay",
  skill: "Data analysis",
  level: "Intermediate",
  taskType: "analysis",
  taskMarkdown:
    "Review the sample order data, identify the most likely source of delays, and explain one change you would test first.",
  timeLimitMinutes: 30,
  rubric: {
    criteria: [
      {
        id: "reasoning_under_questioning",
        name: "Reasoning",
        weight: 30,
        description: "Connects evidence to a defensible conclusion.",
        levels: {
          excellent: "Connects each claim to relevant evidence.",
          good: "Explains the main conclusion with some evidence.",
          weak: "Offers a conclusion without a clear rationale.",
        },
      },
      {
        id: "communication",
        name: "Communication",
        weight: 20,
        description: "Explains the recommendation in clear language.",
        levels: {
          excellent: "Clear, concise, and easy to follow.",
          good: "Understandable with minor gaps.",
          weak: "Hard to follow or missing key details.",
        },
      },
      {
        id: "decision_quality",
        name: "Decision quality",
        weight: 25,
        description: "Chooses a practical next step and states its trade-offs.",
        levels: {
          excellent: "Selects a focused test and explains its trade-offs.",
          good: "Suggests a workable next step.",
          weak: "Does not connect actions to the finding.",
        },
      },
      {
        id: "technical_accuracy",
        name: "Technical accuracy",
        weight: 25,
        description: "Uses the supplied data accurately and consistently.",
        levels: {
          excellent: "Accurately interprets all relevant data.",
          good: "Uses most data correctly.",
          weak: "Misreads key data or assumptions.",
        },
      },
    ],
    notes:
      "Do not reward length. Reward correctness, specificity, and sound reasoning.",
  },
  followupSeeds: [
    "Why did you choose this comparison over an alternative?",
    "Which assumption would you check first?",
    "What would change if the order volume doubled?",
  ],
  suggestedTags: ["analysis", "operations"],
};

function makeChallenge(status = "draft") {
  return {
    ...structuredClone(packageData),
    id: challengeId,
    owner: "startup-1",
    mode: "hiring",
    sourceText:
      "A detailed role description for an operations analyst working with order data.",
    status,
    save: vi.fn().mockResolvedValue(undefined),
  };
}

describe("challenge package validation", () => {
  it("accepts a package with required criteria and weights totaling 100", () => {
    expect(ChallengePackageSchema.safeParse(packageData).success).toBe(true);
  });

  it("rejects missing reasoning criteria and incorrect weight totals", () => {
    const badRubric = structuredClone(packageData.rubric);
    badRubric.criteria[0].weight = 29;
    expect(RubricSchema.safeParse(badRubric).success).toBe(false);
    badRubric.criteria[0].id = "analysis";
    badRubric.criteria[0].weight = 30;
    expect(RubricSchema.safeParse(badRubric).success).toBe(false);
  });
});

describe("challenge routes", () => {
  let ChallengeModel;
  let generateChallengeFn;
  let app;
  const startupCookie = () =>
    `proveit_session=${jwt.sign({ sub: "startup-1", role: "startup" }, env.JWT_SECRET)}`;

  beforeEach(() => {
    ChallengeModel = {
      findById: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findOne: vi.fn(),
    };
    generateChallengeFn = vi.fn();
    app = createApp({
      challengeRouter: createChallengeRouter({
        ChallengeModel,
        generateChallengeFn,
      }),
    });
  });

  it("generates a draft only for a signed-in startup", async () => {
    const challenge = makeChallenge();
    generateChallengeFn.mockResolvedValue(challenge);
    const input = {
      mode: "hiring",
      sourceText:
        "A detailed role description for an operations analyst working with order data.",
    };

    const denied = await request(app)
      .post("/api/challenges/generate")
      .send(input);
    const allowed = await request(app)
      .post("/api/challenges/generate")
      .set("Cookie", startupCookie())
      .send(input);

    expect(denied.status).toBe(401);
    expect(allowed.status).toBe(201);
    expect(generateChallengeFn).toHaveBeenCalledWith({
      owner: "startup-1",
      ...input,
    });
    expect(allowed.body.data.challenge.status).toBe("draft");
  });

  it("keeps draft internals private and returns an approved public view", async () => {
    ChallengeModel.findById.mockResolvedValue(makeChallenge("approved"));

    const response = await request(app).get(`/api/challenges/${challengeId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.challenge.sourceText).toBeUndefined();
    expect(
      response.body.data.challenge.rubric.criteria[0].weight,
    ).toBeUndefined();
    expect(response.body.data.challenge.owner).toBeUndefined();
  });

  it("saves rubric edits only for the owning startup and approves the draft", async () => {
    const challenge = makeChallenge();
    ChallengeModel.findOneAndUpdate.mockResolvedValue(challenge);
    ChallengeModel.findOne.mockResolvedValue(challenge);

    const saved = await request(app)
      .patch(`/api/challenges/${challengeId}`)
      .set("Cookie", startupCookie())
      .send(packageData);
    const approved = await request(app)
      .post(`/api/challenges/${challengeId}/approve`)
      .set("Cookie", startupCookie());

    expect(saved.status).toBe(200);
    expect(ChallengeModel.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
      owner: "startup-1",
      status: "draft",
    });
    expect(approved.status).toBe(200);
    expect(challenge.status).toBe("approved");
    expect(challenge.save).toHaveBeenCalledOnce();
  });
});
