import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api, getApiError } from '../lib/api.js';

function Highlighted({ text, quotes }) {
  const terms = [...new Set(quotes.filter(Boolean).sort((a, b) => b.length - a.length))];
  const pattern = terms.length ? new RegExp(`(${terms.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi') : null;
  return <p className="candidate-answer">{pattern ? text.split(pattern).map((part, index) => terms.some((quote) => quote.toLowerCase() === part.toLowerCase()) ? <mark key={index}>{part}</mark> : part) : text}</p>;
}

export default function CandidateDetail() {
  const { id } = useParams(); const [criterionId, setCriterionId] = useState(''); const [scoreValue, setScoreValue] = useState(''); const [reason, setReason] = useState(''); const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['candidate-review', id], queryFn: async () => (await api.get(`/submissions/${id}/review`)).data.data });
  if (query.isPending) return <main className="candidate-detail"><p role="status">Opening candidate review…</p></main>;
  if (query.isError) return <main className="candidate-detail"><p role="alert">{getApiError(query.error)}</p></main>;
  const { submission, challenge, score } = query.data; const allEvidence = score.criteria.flatMap((criterion) => criterion.evidence); const totals = score.runs.map((run) => run.total);
  async function override(event) {
    event.preventDefault(); setMessage('');
    try { await api.post(`/scores/${id}/override`, { criterionId, score: Number(scoreValue), reason }); setMessage('Override saved and recorded.'); await query.refetch(); }
    catch (error) { setMessage(getApiError(error)); }
  }
  return <main className="candidate-detail"><Link to={`/startup/challenges/${challenge.id}/leaderboard`} className="text-link"><ArrowLeft size={14} /> Leaderboard</Link><p className="eyebrow">Candidate review · attempt {submission.attempt}</p><h1>{submission.candidate.fullName}</h1><p className="candidate-headline">{submission.candidate.headline || submission.candidate.skills?.join(' · ')}</p>
    <section className="detail-summary"><div><strong>{Math.round(score.finalTotal ?? score.total)}</strong><span> / 100</span><p>{score.summary}</p></div><div><span className={`confidence confidence-${score.authenticity}`}>{score.authenticity} confidence</span><p>{score.needsHumanReview ? 'Human review recommended' : 'Three-run grading was consistent'}</p><div className="run-dotplot">{totals.map((value, index) => <span key={index} title={`Run ${index + 1}: ${value}`} style={{ left: `${Math.min(100, value)}%` }} />)}</div><small>Run totals {totals.join(' · ')} · variation {Number(score.variance).toFixed(1)}</small></div></section>
    <section className="candidate-work"><h2>Submitted answer</h2><Highlighted text={submission.answerText} quotes={allEvidence} /></section>
    {submission.followups.map((item) => <section className="candidate-work" key={item.qid}><p className="eyebrow">{item.question}</p><Highlighted text={item.answerTranscript || ''} quotes={allEvidence} /></section>)}
    <section className="result-criteria"><h2>Rubric evidence</h2>{score.criteria.map((item) => <article key={item.id}><div className="criterion-heading"><h3>{item.name}</h3><strong>{item.score} / {item.max}</strong></div><p>{item.why}</p>{item.evidence.map((quote, index) => <p className="evidence-chip" key={index}>{quote}</p>)}</article>)}</section>
    <section className="override-panel"><h2>Record a human score override</h2><p>The AI score remains visible with your reason and updated final total.</p><form onSubmit={override}><label>Criterion<select required value={criterionId} onChange={(event) => { setCriterionId(event.target.value); setScoreValue(score.criteria.find((item) => item.id === event.target.value)?.score ?? ''); }}><option value="">Select criterion</option>{score.criteria.map((item) => <option key={item.id} value={item.id}>{item.name} (max {item.max})</option>)}</select></label><label>New score<input required type="number" min="0" max={score.criteria.find((item) => item.id === criterionId)?.max ?? 100} step="0.5" value={scoreValue} onChange={(event) => setScoreValue(event.target.value)} /></label><label>Reason<textarea required minLength="8" maxLength="1000" value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="button button-dark" disabled={!criterionId}>Save override</button>{message && <p role="status">{message}</p>}</form>{score.overrides.map((item, index) => <p key={index} className="override-entry">{item.criterionId}: {item.oldScore} → {item.newScore} · {item.reason}</p>)}</section>
  </main>;
}
