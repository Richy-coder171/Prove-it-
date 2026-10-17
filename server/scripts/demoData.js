export const DEMO_JOB_DESCRIPTION = `Junior Data Analyst (SQL) at Fieldnote. Help a small operations team understand why orders arrive late. You will query order and shipment tables, explain patterns by region and carrier, and recommend one low-risk experiment. Work with incomplete timestamps, duplicate order events, and modest sample sizes. Communicate assumptions clearly and show the evidence behind each recommendation.`;

export const DEMO_CHALLENGE_PACKAGE = {
  title: "Find the source of late orders",
  skill: "SQL and data analysis",
  level: "Beginner",
  taskType: "analysis",
  taskMarkdown: `A sample order table has 40 orders across three regions and two carriers. Some shipment events are duplicated; one region has only four orders. Compare delivery delay by region and carrier, explain how you handled duplicates and the small sample, then recommend one low-risk experiment. Include a compact SQL query or clear analysis steps.`,
  timeLimitMinutes: 30,
  rubric: {
    criteria: [
      {
        id: "reasoning_under_questioning",
        name: "Reasoning under questioning",
        weight: 30,
        description:
          "Connects evidence, assumptions, and trade-offs when explaining the solution.",
        levels: {
          excellent:
            "Explains a specific decision, tests an alternative, and adapts to a changed condition.",
          good: "Explains the main choice with some relevant support.",
          weak: "Gives a general explanation without linking it to the submitted work.",
        },
      },
      {
        id: "communication",
        name: "Communication",
        weight: 20,
        description:
          "Presents the analysis and recommendation clearly and concisely.",
        levels: {
          excellent:
            "Organized, precise explanation that makes assumptions easy to follow.",
          good: "Understandable with a few missing links.",
          weak: "Difficult to follow or leaves the conclusion unclear.",
        },
      },
      {
        id: "decision_quality",
        name: "Decision quality",
        weight: 25,
        description:
          "Chooses a useful experiment and names the practical trade-offs.",
        levels: {
          excellent:
            "Proposes a focused, reversible test with measurable success criteria.",
          good: "Suggests a reasonable next step with a partial rationale.",
          weak: "Recommends action without connecting it to the findings.",
        },
      },
      {
        id: "technical_accuracy",
        name: "Technical accuracy",
        weight: 25,
        description:
          "Handles duplicates and small samples accurately in the analysis.",
        levels: {
          excellent:
            "Deduplicates events and treats the small region sample cautiously.",
          good: "Addresses the main data issue but misses a limitation.",
          weak: "Counts duplicate events or treats a small sample as conclusive.",
        },
      },
    ],
    notes:
      "Do not reward length. Reward correctness, specificity, and sound reasoning.",
  },
  followupSeeds: [
    "Why did you compare delay by region before carrier?",
    "How did you handle duplicated shipment events?",
    "What would change if order volume doubled?",
  ],
  suggestedTags: ["SQL", "analysis", "operations", "data quality"],
};

export const DEMO_PASTED_ANSWER = `SELECT region, AVG(delivery_days) AS avg_days FROM orders GROUP BY region ORDER BY avg_days DESC;\n\nI chose the region with the highest delay and recommended improving the process there. I would monitor the results to see whether things get better.`;
export const DEMO_PASTED_TRANSCRIPTS = [
  {
    question: "Why did you compare delay by region before carrier?",
    answer:
      "I compared the groups to find the best option. The results showed what was happening, so I picked the highest one.",
  },
  {
    question: "How did you handle duplicated shipment events?",
    answer:
      "I reviewed the data and made the query work. I would check the result again before making a change.",
  },
  {
    question: "What would change if order volume doubled?",
    answer:
      "I would run the query on more rows and improve the process based on the results.",
  },
];
export const DEMO_FOLLOWUPS = {
  questions: [
    {
      id: "q1",
      question: "Why did you compare delay by region before carrier?",
      targets: ["GROUP BY region", "carrier comparison"],
      difficulty: "base",
    },
    {
      id: "q2",
      question: "How did you handle duplicated shipment events?",
      targets: ["duplicate shipment events", "query"],
      difficulty: "probe",
    },
    {
      id: "q3",
      question: "What would change if order volume doubled?",
      targets: ["region comparison", "changed volume"],
      difficulty: "twist",
    },
  ],
};

export const DEMO_GUIDE = {
  weakCriteria: [
    {
      id: "reasoning_under_questioning",
      name: "Reasoning under questioning",
      gap: "The explanation stayed general and did not point to a specific comparison in the submitted query.",
      howToImprove:
        "Name the exact field you grouped by, one alternative comparison, and the evidence that would change your choice.",
    },
  ],
  learningPath: [
    {
      title: "Check grouping choices",
      why: "See how grouping by region and carrier changes the story.",
      estHours: 1,
      resourceHint: "Practice GROUP BY with a small orders table.",
    },
    {
      title: "Work with duplicate events",
      why: "Prevent repeated shipment events from inflating counts.",
      estHours: 1.5,
      resourceHint: "Try ROW_NUMBER or a distinct event key.",
    },
    {
      title: "Explain uncertainty",
      why: "Avoid treating small samples as conclusive.",
      estHours: 1,
      resourceHint: "Compare sample size and range alongside the average.",
    },
  ],
  retryAdvice:
    "On your next attempt, explain one alternative and identify the evidence that would make you change your recommendation.",
};

export function demoScoreCriteria(answer, transcripts, points) {
  const source = `${answer} ${transcripts.map(({ answer: text }) => text).join(" ")}`;
  const quote =
    source
      .split(/[.!?\n]/)
      .map((item) => item.trim())
      .find((item) => item.length >= 12) ?? source.slice(0, 80);
  return DEMO_CHALLENGE_PACKAGE.rubric.criteria.map((criterion, index) => ({
    id: criterion.id,
    name: criterion.name,
    weight: criterion.weight,
    max: criterion.weight,
    score: points[index],
    evidence: [quote.slice(0, 200)],
    why:
      points[index] < criterion.weight * 0.5
        ? "The response would be stronger with a specific example from the submitted work."
        : "The response connects a clear choice to relevant evidence from the work.",
  }));
}

export function demoGraderResponse(
  answer,
  transcripts,
  points,
  authenticity = "high",
  varianceStep = 0,
) {
  const criteria = demoScoreCriteria(answer, transcripts, points);
  const total = criteria.reduce((sum, item) => sum + item.score, 0);
  return {
    criteria,
    total,
    summary:
      "This review links the score to the submitted analysis and its explanation.",
    authenticity: {
      level: authenticity,
      reasons: [
        authenticity === "low"
          ? "The explanation stayed general and had limited links to the submitted choices."
          : "The explanation consistently referred to choices visible in the submitted work.",
      ],
    },
    graderConfidence:
      authenticity === "low" ? 0.52 : 0.88 - varianceStep * 0.03,
  };
}
