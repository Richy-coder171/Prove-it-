import { z } from "zod";

const criterionSchema = z
  .object({
    id: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{2,50}$/),
    name: z.string().trim().min(2).max(80),
    weight: z.number().min(1).max(100),
    description: z.string().trim().min(12).max(500),
    levels: z
      .object({
        excellent: z.string().trim().min(8).max(220),
        good: z.string().trim().min(8).max(220),
        weak: z.string().trim().min(8).max(220),
      })
      .strict(),
  })
  .strict();

export const RubricSchema = z
  .object({
    criteria: z.array(criterionSchema).min(4).max(6),
    notes: z.string().trim().min(8).max(500),
  })
  .strict()
  .superRefine((rubric, context) => {
    const ids = rubric.criteria.map(({ id }) => id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["criteria"],
        message: "Criterion IDs must be unique",
      });
    const total = rubric.criteria.reduce((sum, { weight }) => sum + weight, 0);
    if (Math.round(total * 100) / 100 !== 100)
      context.addIssue({
        code: "custom",
        path: ["criteria"],
        message: "Rubric weights must sum to 100",
      });
    const reasoning = rubric.criteria.find(
      ({ id }) => id === "reasoning_under_questioning",
    );
    if (!reasoning || reasoning.weight < 20)
      context.addIssue({
        code: "custom",
        path: ["criteria"],
        message:
          "Include reasoning_under_questioning with a weight of at least 20",
      });
    if (!ids.includes("communication"))
      context.addIssue({
        code: "custom",
        path: ["criteria"],
        message: "Include the communication criterion",
      });
  });

export const ChallengePackageSchema = z
  .object({
    title: z.string().trim().min(4).max(200),
    skill: z.string().trim().min(2).max(100),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    taskType: z.enum(["code", "analysis", "writing", "plan"]),
    taskMarkdown: z.string().trim().min(50).max(12_000),
    starterCode: z.string().max(12_000).optional(),
    timeLimitMinutes: z.number().int().min(15).max(60),
    rubric: RubricSchema,
    followupSeeds: z.array(z.string().trim().min(12).max(300)).min(3).max(5),
    suggestedTags: z.array(z.string().trim().min(2).max(40)).max(12),
  })
  .strict();

export const ChallengeGenerationInputSchema = z
  .object({
    mode: z.enum(["hiring", "founder"]).default("hiring"),
    sourceText: z.string().trim().min(30).max(20_000),
  })
  .strict();

export const ChallengeUpdateSchema = ChallengePackageSchema;

export const SkillGapGuideSchema = z
  .object({
    weakCriteria: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            gap: z.string().trim().min(10).max(400),
            howToImprove: z.string().trim().min(10).max(500),
          })
          .strict(),
      )
      .min(1)
      .max(6),
    learningPath: z
      .array(
        z
          .object({
            title: z.string().trim().min(3).max(120),
            why: z.string().trim().min(8).max(300),
            estHours: z.number().min(0.5).max(80),
            resourceHint: z.string().trim().min(3).max(160),
          })
          .strict(),
      )
      .min(3)
      .max(5),
    retryAdvice: z.string().trim().min(15).max(800),
  })
  .strict();
