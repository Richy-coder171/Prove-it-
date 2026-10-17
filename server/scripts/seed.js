import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb } from "../src/config/db.js";
import User from "../src/models/User.js";
import Challenge from "../src/models/Challenge.js";
import Submission from "../src/models/Submission.js";
import Score from "../src/models/Score.js";
import Badge from "../src/models/Badge.js";
import Shortlist from "../src/models/Shortlist.js";
import Endorsement from "../src/models/Endorsement.js";
import Opportunity from "../src/models/Opportunity.js";
import Venture from "../src/models/Venture.js";
import { issueBadge } from "../src/services/badge.js";
import {
  DEMO_CHALLENGE_PACKAGE,
  DEMO_JOB_DESCRIPTION,
  DEMO_PASTED_ANSWER,
  DEMO_PASTED_TRANSCRIPTS,
  demoScoreCriteria,
} from "./demoData.js";

export const DEMO_PASSWORD = "ProveItDemo2026!";
const demoEmail = (name) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")}@demo.proveit.test`;
const candidates = [
  {
    name: "Pasted",
    scores: [8, 14, 18, 18],
    authenticity: "low",
    confidence: 0.5,
    answer: DEMO_PASTED_ANSWER,
    transcripts: DEMO_PASTED_TRANSCRIPTS,
  },
  {
    name: "Genuine",
    scores: [25, 17, 20, 22],
    authenticity: "high",
    confidence: 0.91,
    answer: `I grouped by region first because the four orders in the smallest region make a carrier ranking unstable. I removed duplicate shipment_event_id values before measuring delivery_days. I would test a carrier handoff alert for one week and track late-order rate.`,
    transcripts: [
      {
        question: "Why did you compare delay by region before carrier?",
        answer:
          "I grouped by region first because the smallest region has only four orders, so a carrier ranking there would be unstable.",
      },
      {
        question: "How did you handle duplicated shipment events?",
        answer:
          "I removed duplicate shipment_event_id values before calculating delivery_days, otherwise repeated scans would inflate the duration rows.",
      },
      {
        question: "What would change if order volume doubled?",
        answer:
          "I would rerun the same deduplicated comparison and check whether the carrier difference holds in the added orders before expanding the alert.",
      },
    ],
  },
  ...["Ari", "Mina", "Dev", "Rohan", "Leah", "Noor"].map((name, index) => ({
    name,
    scores: [18 + index, 14 + (index % 4), 16 + (index % 6), 17 + (index % 7)],
    authenticity: index % 3 === 0 ? "medium" : "high",
    confidence: 0.7 + index * 0.025,
    answer: `I deduplicated shipment events and compared regional delay before choosing a small alert experiment. I would check late-order rate and sample size again after one week.`,
    transcripts: [
      {
        question: "What did you check?",
        answer:
          "I deduplicated shipment_event_id and compared regional delay before selecting the alert experiment.",
      },
      {
        question: "What measure matters?",
        answer:
          "The late-order rate matters, and I would check the sample size after the test.",
      },
      {
        question: "What if volume changes?",
        answer:
          "I would rerun the comparison with the new orders before expanding the test.",
      },
    ],
  })),
];

const founderPackage = {
  ...DEMO_CHALLENGE_PACKAGE,
  title: "Find the first ten customers",
  skill: "Customer discovery",
  level: "Intermediate",
  taskType: "plan",
  taskMarkdown:
    "Plan two weeks of customer discovery for the Fieldnote operations product. Choose a narrow first customer segment, write a short outreach message, define three questions, and set one measurable signal that would make you change direction. State what you would defer.",
  timeLimitMinutes: 30,
};
const founderIdea =
  "Fieldnote helps small online retailers see where orders slow down and coordinate their carrier handoffs.";

async function upsertUser(
  { name, role, orgName, skills = [], headline = "" },
  passwordHash,
) {
  const slug =
    role === "candidate"
      ? `${name.toLowerCase()}-${name.toLowerCase()}-demo`
      : undefined;
  return User.findOneAndUpdate(
    { email: demoEmail(name) },
    {
      $set: {
        fullName: name,
        role,
        passwordHash,
        ...(orgName ? { orgName } : {}),
        ...(slug ? { slug, skills, headline } : {}),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

function pointsTotal(scores) {
  return scores.reduce((sum, value) => sum + value, 0);
}

async function createSeedSubmission({
  candidate,
  challenge,
  item,
  attempt = 1,
}) {
  const startedAt = new Date(Date.now() - 65 * 60_000);
  const submission = await Submission.create({
    challenge: challenge.id,
    candidate: candidate.id,
    attempt,
    status: "graded",
    startedAt,
    deadlineAt: new Date(startedAt.getTime() + 30 * 60_000),
    answerText: item.answer,
    submittedAt: new Date(startedAt.getTime() + 25 * 60_000),
    followups: item.transcripts.map((entry, index) => ({
      qid: `q${index + 1}`,
      question: entry.question,
      targets: ["specific choice"],
      difficulty: ["base", "probe", "twist"][index],
      answerTranscript: entry.answer,
      answeredAt: new Date(startedAt.getTime() + (30 + index) * 60_000),
      answeredBy: "text",
    })),
  });
  const criteria = demoScoreCriteria(
    item.answer,
    item.transcripts,
    item.scores,
  );
  const total = pointsTotal(item.scores);
  const runs = [-2, 0, 1].map((delta, index) => ({
    total: Math.max(0, total + delta),
    summary:
      "A seed review linked rubric scores to the work and defense transcript.",
    authenticity: {
      level: item.authenticity,
      reasons: ["Explanation checked against submitted choices."],
    },
    graderConfidence: Math.max(0.4, item.confidence - index * 0.02),
    criteria: criteria.map((criterion) => ({
      ...criterion,
      score: Math.max(
        0,
        Math.min(
          criterion.max,
          criterion.score +
            (criterion.id === "reasoning_under_questioning" ? delta : 0),
        ),
      ),
    })),
  }));
  const score = await Score.create({
    submission: submission.id,
    runs,
    criteria,
    total,
    finalTotal: total,
    variance: 1.25,
    needsHumanReview: item.authenticity === "low",
    authenticity: item.authenticity,
    authenticityReasons: [
      item.authenticity === "low"
        ? "The explanation stayed general and had limited links to the submitted choices."
        : "The explanation consistently referred to choices visible in the submitted work.",
    ],
    graderConfidence: item.confidence,
    summary:
      item.authenticity === "low"
        ? "The query is readable, but the explanation does not identify how the grouping choice addresses duplicate events or a small sample."
        : "The candidate connects deduplication, sample size, and a reversible experiment to the analysis.",
  });
  const badge = await issueBadge({ submission, challenge, score });
  return { submission, score, badge };
}

export async function seedDemoData() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const startup = await upsertUser(
    { name: "Fieldnote Startup", role: "startup", orgName: "Fieldnote" },
    passwordHash,
  );
  const founder = await upsertUser(
    { name: "Fieldnote Founder", role: "startup", orgName: "Fieldnote" },
    passwordHash,
  );
  const mentor = await upsertUser(
    { name: "Demo Mentor", role: "mentor" },
    passwordHash,
  );
  const users = [];
  for (const item of candidates)
    users.push(
      await upsertUser(
        {
          name: item.name,
          role: "candidate",
          skills: ["SQL", "data analysis", "operations"],
          headline:
            item.name === "Genuine"
              ? "Junior analyst who checks assumptions"
              : "Early-career analyst",
        },
        passwordHash,
      ),
    );

  const hiringChallenge = await Challenge.findOneAndUpdate(
    { owner: startup.id, title: DEMO_CHALLENGE_PACKAGE.title },
    {
      $set: {
        ...DEMO_CHALLENGE_PACKAGE,
        owner: startup.id,
        mode: "hiring",
        sourceText: DEMO_JOB_DESCRIPTION,
        status: "approved",
        approvedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const founderChallenge = await Challenge.findOneAndUpdate(
    { owner: founder.id, title: founderPackage.title },
    {
      $set: {
        ...founderPackage,
        owner: founder.id,
        mode: "founder",
        sourceText: founderIdea,
        status: "approved",
        approvedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const roots = [hiringChallenge.id, founderChallenge.id];
  const demoChallenges = await Challenge.find({
    $or: [{ _id: { $in: roots } }, { variantOf: { $in: roots } }],
  }).select("_id");
  const challengeIds = demoChallenges.map(({ _id }) => _id);
  const oldSubmissions = await Submission.find({
    challenge: { $in: challengeIds },
  }).select("_id");
  const oldIds = oldSubmissions.map(({ _id }) => _id);
  await Promise.all([
    Score.deleteMany({ submission: { $in: oldIds } }),
    Badge.deleteMany({ submission: { $in: oldIds } }),
    Shortlist.deleteMany({ challenge: { $in: challengeIds } }),
    Endorsement.deleteMany({ submission: { $in: oldIds } }),
    Submission.deleteMany({ _id: { $in: oldIds } }),
    Venture.deleteMany({ owner: founder.id, challenge: founderChallenge.id }),
  ]);

  const hiringRecords = [];
  for (let index = 0; index < users.length; index += 1)
    hiringRecords.push(
      await createSeedSubmission({
        candidate: users[index],
        challenge: hiringChallenge,
        item: candidates[index],
      }),
    );
  const founderRecords = [];
  founderRecords.push(
    await createSeedSubmission({
      candidate: users[1],
      challenge: founderChallenge,
      item: candidates[1],
    }),
  );
  founderRecords.push(
    await createSeedSubmission({
      candidate: users[2],
      challenge: founderChallenge,
      item: candidates[2],
    }),
  );

  const endorsement = await Endorsement.create({
    submission: founderRecords[0].submission.id,
    mentor: mentor.id,
    text: "Specific customer focus and a useful testable decision signal.",
    rating: 5,
  });
  founderRecords[0].badge.endorsement = endorsement.id;
  await founderRecords[0].badge.save();
  const venture = await Venture.create({
    owner: founder.id,
    challenge: founderChallenge.id,
    name: "Fieldnote",
    oneLiner: "Help small retailers spot and fix slow order handoffs.",
    mentor: mentor.id,
    memberSubmissions: [founderRecords[0].submission.id],
  });

  for (let index = 0; index < 12; index += 1) {
    const tags = [
      ["SQL", "analytics"],
      ["operations", "data quality"],
      ["customer discovery", "founder"],
      ["product", "research"],
    ][index % 4];
    const title = `${["Junior SQL analyst", "Operations research associate", "Customer discovery sprint", "Data quality challenge"][index % 4]} · Demo ${index + 1}`;
    await Opportunity.findOneAndUpdate(
      { title },
      {
        $set: {
          kind:
            index % 3 === 0
              ? "job"
              : index % 3 === 1
                ? "founder_idea"
                : "challenge",
          title,
          org: ["Fieldnote", "Northstar", "Common Thread"][index % 3],
          description:
            "A practical project for a small team that values clear assumptions and measurable progress.",
          tags,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  return {
    startup,
    founder,
    mentor,
    candidates: users,
    hiringChallenge,
    founderChallenge,
    hiringRecords,
    founderRecords,
    venture,
    sampleBadgeId: hiringRecords[1].badge.verificationId,
  };
}

if (process.argv[1]?.endsWith("/seed.js")) {
  try {
    await connectDb();
    const data = await seedDemoData();
    process.stdout.write(
      `Seeded demo: 1 startup, 1 founder, 1 mentor, 8 candidates, 12 opportunities; sample badge ${data.sampleBadgeId}\n`,
    );
  } catch (error) {
    process.stderr.write(`Demo seed failed: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
