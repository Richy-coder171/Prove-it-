import {
  DEMO_JOB_DESCRIPTION,
  DEMO_PASTED_ANSWER,
  DEMO_PASTED_TRANSCRIPTS,
} from "./demoData.js";

const base =
  process.env.SMOKE_API_URL ??
  `http://localhost:${process.env.PORT ?? 5000}/api`;
const smokeEmail = `smoke.${Date.now()}@example.test`;

async function call(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false)
    throw new Error(
      `${method} ${path} failed (${response.status}): ${data.error?.message ?? "no response body"}`,
    );
  return {
    data: data.data,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}

try {
  const startup = await call("/auth/register", {
    method: "POST",
    body: {
      email: smokeEmail,
      password: "SmokePass2026!",
      fullName: "Smoke Startup",
      role: "startup",
      orgName: "Smoke Labs",
    },
  });
  const generated = await call("/challenges/generate", {
    method: "POST",
    cookie: startup.cookie,
    body: { mode: "hiring", sourceText: DEMO_JOB_DESCRIPTION },
  });
  const challengeId = generated.data.challenge.id;
  await call(`/challenges/${challengeId}/approve`, {
    method: "POST",
    cookie: startup.cookie,
  });

  const candidate = await call("/auth/register", {
    method: "POST",
    body: {
      email: `candidate.${Date.now()}@example.test`,
      password: "SmokePass2026!",
      fullName: "Smoke Candidate",
      role: "candidate",
    },
  });
  const started = await call("/submissions/start", {
    method: "POST",
    cookie: candidate.cookie,
    body: { challengeId },
  });
  const submissionId = started.data.submission.id;
  await call(`/submissions/${submissionId}/autosave`, {
    method: "PATCH",
    cookie: candidate.cookie,
    body: { answerText: DEMO_PASTED_ANSWER },
  });
  await call(`/submissions/${submissionId}/submit`, {
    method: "POST",
    cookie: candidate.cookie,
  });
  const followups = await call(`/submissions/${submissionId}/followups`, {
    method: "POST",
    cookie: candidate.cookie,
  });
  if (followups.data.questions.length !== 3)
    throw new Error(
      "Follow-up generator did not return exactly three questions.",
    );
  for (let index = 0; index < followups.data.questions.length; index += 1) {
    const question = followups.data.questions[index];
    await call(`/submissions/${submissionId}/followups/${question.id}/answer`, {
      method: "POST",
      cookie: candidate.cookie,
      body: { text: DEMO_PASTED_TRANSCRIPTS[index].answer },
    });
  }
  const finalized = await call(`/submissions/${submissionId}/finalize`, {
    method: "POST",
    cookie: candidate.cookie,
  });
  const result = await call(`/submissions/${submissionId}/result`, {
    cookie: candidate.cookie,
  });
  const verificationId = result.data.badge?.verificationId;
  if (!verificationId)
    throw new Error("Grading finished without issuing a badge.");
  const verification = await call(`/badges/${verificationId}`);
  if (!verification.data.verified)
    throw new Error("The issued badge did not verify.");
  process.stdout.write(
    `Smoke passed: challenge ${challengeId}; submission ${submissionId}; score ${Math.round(finalized.data.score.finalTotal ?? finalized.data.score.total)}; badge ${verificationId} verified.\n`,
  );
} catch (error) {
  process.stderr.write(`Smoke failed: ${error.message}\n`);
  process.exitCode = 1;
}
