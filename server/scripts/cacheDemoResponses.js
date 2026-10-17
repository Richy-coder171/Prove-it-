import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import AiCache from "../src/models/AiCache.js";
import Challenge from "../src/models/Challenge.js";
import Score from "../src/models/Score.js";
import Submission from "../src/models/Submission.js";
import { aiCacheKey } from "../src/services/ai/cache.js";
import {
  ChallengePackageSchema,
  FollowupSetSchema,
  GraderOutputSchema,
  SkillGapGuideSchema,
} from "../src/services/ai/schemas.js";
import {
  DEMO_CHALLENGE_PACKAGE,
  DEMO_JOB_DESCRIPTION,
  DEMO_PASTED_ANSWER,
  DEMO_PASTED_TRANSCRIPTS,
  DEMO_FOLLOWUPS,
  DEMO_GUIDE,
  demoGraderResponse,
} from "./demoData.js";

const escapeData = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
async function cache(key, response) {
  await AiCache.updateOne({ key }, { $set: { response } }, { upsert: true });
}

export async function seedDemoCache() {
  const challenge = await Challenge.findOne({
    title: DEMO_CHALLENGE_PACKAGE.title,
    sourceText: DEMO_JOB_DESCRIPTION,
    mode: "hiring",
  });
  if (!challenge)
    throw new Error("Run the demo data seed before caching AI responses.");
  await cache(
    aiCacheKey("challenge", {
      mode: "hiring",
      sourceText: DEMO_JOB_DESCRIPTION,
      instruction: "",
    }),
    ChallengePackageSchema.parse(DEMO_CHALLENGE_PACKAGE),
  );
  const followupPayload = {
    answerText: DEMO_PASTED_ANSWER,
    challenge: {
      title: challenge.title,
      task: challenge.taskMarkdown,
      rubric: challenge.rubric.criteria.map(({ id, name }) => ({ id, name })),
    },
    seeds: challenge.followupSeeds,
  };
  await cache(
    aiCacheKey("followups", followupPayload),
    FollowupSetSchema.parse(DEMO_FOLLOWUPS),
  );

  const graderInput = `${JSON.stringify({ task: challenge.taskMarkdown, rubric: challenge.rubric })}\n<candidate_answer>${escapeData(DEMO_PASTED_ANSWER)}</candidate_answer>\n<candidate_transcripts>${escapeData(JSON.stringify(DEMO_PASTED_TRANSCRIPTS))}</candidate_transcripts>`;
  for (let index = 0; index < 3; index += 1)
    await cache(
      aiCacheKey("grader", { input: graderInput, runIndex: index }),
      GraderOutputSchema.parse(
        demoGraderResponse(
          DEMO_PASTED_ANSWER,
          DEMO_PASTED_TRANSCRIPTS,
          [8 + (index % 2), 14, 18, 18],
          "low",
          index,
        ),
      ),
    );

  const submission = await Submission.findOne({
    challenge: challenge.id,
    answerText: DEMO_PASTED_ANSWER,
    candidate: { $exists: true },
  });
  const score = submission
    ? await Score.findOne({ submission: submission.id })
    : null;
  const criteria =
    score?.criteria
      .map(({ id, name, score: points, max, why }) => ({
        id,
        name,
        score: points,
        max,
        why,
      }))
      .sort((a, b) => a.score / a.max - b.score / b.max)
      .slice(0, 4) ?? [];
  const guideInput = {
    criteria,
    challenge: {
      title: challenge.title,
      skill: challenge.skill,
      taskMarkdown: challenge.taskMarkdown,
    },
  };
  const checkedGuide = SkillGapGuideSchema.parse(DEMO_GUIDE);
  await cache(aiCacheKey("skillgap", guideInput), checkedGuide);
  return 6;
}

if (process.argv[1]?.endsWith("/cacheDemoResponses.js")) {
  try {
    await connectDb();
    const count = await seedDemoCache();
    process.stdout.write(`Cached ${count} deterministic demo AI responses.\n`);
  } catch (error) {
    process.stderr.write(`Demo response cache failed: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
