import { describe, expect, it } from "vitest";
import { aggregateRuns, validateGraderRun } from "../src/services/ai/grader.js";
import { validateEvidence } from "../src/utils/evidence.js";

const rubric = {
  criteria: [
    { id: "reasoning_under_questioning", name: "Reasoning", weight: 30 },
    { id: "communication", name: "Communication", weight: 20 },
    { id: "decision_quality", name: "Decision quality", weight: 25 },
    { id: "technical_accuracy", name: "Technical accuracy", weight: 25 },
  ],
};
function run(total, confidence = 0.9) {
  const criteria = rubric.criteria.map((criterion) => ({
    ...criterion,
    max: criterion.weight,
    score: criterion.weight * 0.7,
    evidence: ["I compared delay by region"],
    why: "This ties the decision to a specific comparison.",
  }));
  return {
    criteria,
    total,
    summary: "The answer uses a relevant comparison.",
    authenticity: {
      level: "high",
      reasons: ["The explanation matches the stated approach."],
    },
    graderConfidence: confidence,
  };
}

describe("evidence validation", () => {
  it("accepts normalized substrings and close spelling, and rejects invented quotes", () => {
    const checked = validateEvidence(
      [
        "Delay, by   region!",
        "I compared delay by region",
        "The candidate built a payment gateway",
      ],
      ["I compared delay by region and tested the result."],
    );
    expect(checked.valid).toEqual([
      "Delay, by   region!",
      "I compared delay by region",
    ]);
    expect(checked.rejected).toEqual(["The candidate built a payment gateway"]);
  });

  it("drops invented evidence and caps unsupported scores at forty percent", () => {
    const input = run(88);
    input.criteria[0].evidence = ["Invented quote not in the source"];
    const checked = validateGraderRun(input, rubric, [
      "The source answer has a regional comparison.",
    ]);
    expect(checked.criteria[0].evidence).toEqual([]);
    expect(checked.criteria[0].score).toBe(12);
    expect(checked.criteria[0].evidenceCapped).toBe(true);
  });
});

describe("grader aggregation", () => {
  it("uses median scores, deviation, confidence and authenticity vote", () => {
    const low = run(62);
    low.authenticity.level = "low";
    const mid = run(74);
    mid.criteria[0].score = 20;
    const high = run(78);
    const aggregate = aggregateRuns([low, mid, high]);
    expect(aggregate.variance).toBeCloseTo(6.8, 1);
    expect(aggregate.criteria[0].score).toBe(21);
    expect(aggregate.authenticity).toBe("high");
    expect(aggregate.needsHumanReview).toBe(true);
    expect(aggregate.total).toBe(70);
  });

  it("marks close, confident runs as not needing extra review", () => {
    const aggregate = aggregateRuns([run(70), run(71), run(70)]);
    expect(aggregate.needsHumanReview).toBe(false);
    expect(aggregate.variance).toBeLessThan(1);
  });
});
