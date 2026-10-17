import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, getApiError } from '../lib/api.js';

export default function MentorQueue() {
  const [drafts, setDrafts] = useState({}); const [sent, setSent] = useState({}); const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['mentor-queue'], queryFn: async () => (await api.get('/mentor/queue')).data.data });
  async function endorse(submissionId) {
    setError('');
    try { await api.post('/mentor/endorse', { submissionId, text: drafts[submissionId] || '', rating: 5 }); setSent((items) => ({ ...items, [submissionId]: true })); }
    catch (reason) { setError(getApiError(reason)); }
  }
  if (query.isPending) return <main className="mentor-page"><p role="status">Finding submissions for review…</p></main>;
  if (query.isError) return <main className="mentor-page"><p role="alert">{getApiError(query.error)}</p></main>;
  return <main className="mentor-page"><p className="eyebrow">Mentor workspace</p><h1>Give good work a signal.</h1><p className="mentor-intro">Top five completed results per challenge. Candidate names and contact details stay hidden.</p>{error && <p className="form-error" role="alert">{error}</p>}{query.data.challenges.map((group) => <section className="mentor-challenge" key={group.challenge.id}><p className="eyebrow">{group.challenge.skill} · {group.challenge.mode}</p><h2>{group.challenge.title}</h2>{group.rows.map((row) => <article className="mentor-row" key={row.submissionId}><div><span className="mentor-anon">{row.candidateLabel}</span><strong>{Math.round(row.total)} / 100</strong><p>{row.summary}</p><span className={`confidence confidence-${row.authenticity}`}>{row.authenticity} confidence</span>{row.needsHumanReview && <span className="review-flag">Human review suggested</span>}<div className="mentor-criteria">{row.criteria.map((item) => <span key={item.id}>{item.name}: {item.score}/{item.max}</span>)}</div></div>{sent[row.submissionId] ? <span className="defend-saved">Endorsement recorded</span> : <form onSubmit={(event) => { event.preventDefault(); void endorse(row.submissionId); }}><label>Endorsement<textarea minLength="8" maxLength="280" required value={drafts[row.submissionId] ?? ''} onChange={(event) => setDrafts((items) => ({ ...items, [row.submissionId]: event.target.value }))} placeholder="What stood out about this work?" /></label><button className="button button-dark">Endorse</button></form>}</article>)}</section>)}</main>;
}
