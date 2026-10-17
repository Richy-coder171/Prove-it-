import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, getApiError } from '../lib/api.js';

async function loadResult(id) {
  try { return (await api.get(`/submissions/${id}/result`)).data.data; }
  catch (error) {
    if (error.response?.status !== 404 || error.response?.data?.error?.code !== 'RESULT_PENDING') throw error;
    await api.post(`/submissions/${id}/finalize`);
    return (await api.get(`/submissions/${id}/result`)).data.data;
  }
}

export default function Result() {
  const { id } = useParams();
  const result = useQuery({ queryKey: ['result', id], queryFn: () => loadResult(id), retry: false });
  if (result.isPending) return <main className="result-page"><p className="eyebrow">A careful read of your work</p><h1>Reviewing your answer.</h1><div className="grading-steps" aria-live="polite"><span>Scoring against the approved rubric</span><span>Checking evidence in your answer and explanations</span><span>Comparing independent review runs</span></div></main>;
  if (result.isError) return <main className="result-page"><p className="eyebrow">Your result</p><h1>Review needs another try.</h1><p role="alert">{getApiError(result.error)}</p><button className="button button-dark" onClick={() => result.refetch()}>Retry scoring</button><Link className="text-link" to={`/s/${id}/defend`}>Return to your defense</Link></main>;
  const { score, challenge } = result.data;
  const total = score.finalTotal ?? score.total;
  return <main className="result-page">
    <p className="eyebrow">{challenge.skill} · {challenge.level}</p><h1>Your work, reviewed.</h1>
    <div className="result-summary"><div className="result-score"><strong>{Math.round(total)}</strong><span>/ 100</span></div><div><h2>{challenge.title}</h2><p>{score.summary}</p></div></div>
    <div className="result-signals"><section><p className="eyebrow">Explanation confidence</p><strong className={`confidence confidence-${score.authenticity}`}>{score.authenticity} confidence</strong><p>{score.authenticityReasons?.join(' ') || 'This signal summarizes how closely the explanation matched the submitted work.'}</p></section><section><p className="eyebrow">Review consistency</p><strong>{score.needsHumanReview ? 'Human review recommended' : 'Consistent across reviews'}</strong><p>Run variation: {Number(score.variance).toFixed(1)} points · Average grader confidence: {Math.round(score.graderConfidence * 100)}%</p></section></div>
    <section className="result-criteria"><h2>How the rubric was applied</h2>{score.criteria.map((criterion) => <article key={criterion.id}><div className="criterion-heading"><h3>{criterion.name}</h3><strong>{Number(criterion.score).toFixed(1)} / {criterion.max}</strong></div><div className="criterion-bar"><span style={{ width: `${Math.min(100, (criterion.score / criterion.max) * 100)}%` }} /></div><p>{criterion.why}</p><div className="evidence-list">{criterion.evidence.map((quote, index) => <blockquote key={`${criterion.id}-${index}`}>“{quote}”</blockquote>)}</div></article>)}</section>
    <div className="result-actions"><p>Every score is advisory. You can ask the hiring team for a human re-review.</p><button className="button button-dark" onClick={async (event) => { event.currentTarget.disabled = true; try { await api.post('/rereview', { submissionId: id, reason: 'Please review my result.' }); event.currentTarget.textContent = 'Review requested'; } catch { event.currentTarget.disabled = false; event.currentTarget.textContent = 'Request human review'; } }}>Request human review</button></div>
  </main>;
}
