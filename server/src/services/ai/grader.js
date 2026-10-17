import { z } from 'zod';
import { env } from '../../config/env.js';
import Score from '../../models/Score.js';
import Submission from '../../models/Submission.js';
import { validateEvidence } from '../../utils/evidence.js';
import { callClaudeJSON } from './client.js';
import { graderSystem } from './prompts/grader.js';

export const GraderOutputSchema = z.object({
  criteria: z.array(z.object({ id: z.string(), name: z.string(), weight: z.number().min(1).max(100), score: z.number().min(0).max(100), max: z.number().min(1).max(100), evidence: z.array(z.string().min(1).max(500)).max(5), why: z.string().trim().min(8).max(1000) }).strict()).min(4).max(6),
  total: z.number().min(0).max(100), summary: z.string().trim().min(8).max(1200),
  authenticity: z.object({ level: z.enum(['high', 'medium', 'low']), reasons: z.array(z.string().trim().min(2).max(300)).max(8) }).strict(),
  graderConfidence: z.number().min(0).max(1),
}).strict().superRefine(({ criteria }, ctx) => {
  criteria.forEach(({ score, max }, index) => { if (score > max) ctx.addIssue({ code: 'custom', path: ['criteria', index, 'score'], message: 'Score cannot exceed criterion maximum' }); });
});

export function validateGraderRun(output, rubric, sources) {
  const parsed = GraderOutputSchema.parse(output);
  const expected = new Map(rubric.criteria.map((criterion) => [criterion.id, criterion]));
  if (parsed.criteria.length !== expected.size || parsed.criteria.some(({ id }) => !expected.has(id))) throw new Error('Grader criteria do not match the approved rubric');
  let total = 0;
  const criteria = parsed.criteria.map((criterion) => {
    const approved = expected.get(criterion.id);
    if (criterion.max !== approved.weight || criterion.weight !== approved.weight) throw new Error(`Grader maximum does not match rubric for ${criterion.id}`);
    const score = Math.min(criterion.score, approved.weight);
    const checked = validateEvidence(criterion.evidence, sources);
    const cappedScore = checked.valid.length === 0 && score > approved.weight * 0.4 ? approved.weight * 0.4 : score;
    total += cappedScore;
    return { ...criterion, score: cappedScore, max: approved.weight, weight: approved.weight, evidence: checked.valid, evidenceRejected: checked.rejected, evidenceCapped: cappedScore < score };
  });
  return { ...parsed, criteria, total };
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const escapeData = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const standardDeviation = (values) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
};

export function aggregateRuns(runs) {
  if (runs.length < 2) throw new Error('At least two valid grader runs are required');
  const criteria = runs[0].criteria.map((base) => {
    const values = runs.map((run) => run.criteria.find(({ id }) => id === base.id));
    const score = median(values.map(({ score: value }) => value));
    const why = [...values].sort((a, b) => Math.abs(a.score - score) - Math.abs(b.score - score))[0].why;
    const evidence = [...new Set(values.flatMap(({ evidence: quotes }) => quotes))];
    return { id: base.id, name: base.name, weight: base.weight, max: base.max, score, why, evidence };
  });
  const totals = runs.map(({ total }) => total);
  const authenticityCount = Object.fromEntries(['high', 'medium', 'low'].map((level) => [level, runs.filter((run) => run.authenticity.level === level).length]));
  const topVotes = Math.max(...Object.values(authenticityCount));
  const leaders = Object.entries(authenticityCount).filter(([, count]) => count === topVotes);
  const authenticity = leaders.length === 1 ? leaders[0][0] : 'medium';
  const criterionSpreadNeedsReview = criteria.some(({ id, max }) => {
    const scores = runs.map((run) => run.criteria.find((criterion) => criterion.id === id).score);
    return Math.max(...scores) - Math.min(...scores) > max * 0.35;
  });
  const variance = standardDeviation(totals);
  const meanConfidence = runs.reduce((sum, run) => sum + run.graderConfidence, 0) / runs.length;
  const total = criteria.reduce((sum, criterion) => sum + criterion.score, 0);
  return {
    criteria, total, variance, needsHumanReview: variance > 6 || criterionSpreadNeedsReview || meanConfidence < 0.6,
    authenticity, authenticityReasons: [...new Set(runs.filter((run) => run.authenticity.level === authenticity).flatMap((run) => run.authenticity.reasons))],
    graderConfidence: meanConfidence,
    summary: [...runs].sort((a, b) => Math.abs(a.total - total) - Math.abs(b.total - total))[0].summary,
  };
}

export async function gradeSubmission({ submissionId, SubmissionModel = Submission, ScoreModel = Score, generate = callClaudeJSON, runCount = env.GRADER_RUNS }) {
  const submission = await SubmissionModel.findById(submissionId).populate('challenge');
  if (!submission || !submission.challenge) throw Object.assign(new Error('Submission not found'), { status: 404, code: 'NOT_FOUND' });
  const challenge = submission.challenge;
  const transcripts = submission.followups.filter(({ answerTranscript }) => answerTranscript).map(({ question, answerTranscript }) => ({ question, answer: answerTranscript }));
  const sources = [submission.answerText, ...transcripts.map(({ answer }) => answer)];
  const input = `${JSON.stringify({ task: challenge.taskMarkdown, rubric: challenge.rubric })}\n<candidate_answer>${escapeData(submission.answerText)}</candidate_answer>\n<candidate_transcripts>${escapeData(JSON.stringify(transcripts))}</candidate_transcripts>`;
  const outcomes = await Promise.allSettled(Array.from({ length: runCount }, () => generate({ system: graderSystem, user: input, schema: GraderOutputSchema, maxTokens: 2800, temperature: 0.2 })));
  const runs = outcomes.flatMap((outcome) => {
    if (outcome.status !== 'fulfilled') return [];
    try { return [validateGraderRun(outcome.value, challenge.rubric, sources)]; }
    catch { return []; }
  });
  if (runs.length < 2) throw Object.assign(new Error('Scoring could not reach a reliable result. Please retry or request human review.'), { status: 502, code: 'GRADING_UNAVAILABLE' });
  const aggregate = aggregateRuns(runs);
  const score = await ScoreModel.findOneAndUpdate({ submission: submission.id }, { $set: { ...aggregate, runs, finalTotal: aggregate.total } }, { upsert: true, new: true, runValidators: true });
  return { score, submission, challenge };
}
