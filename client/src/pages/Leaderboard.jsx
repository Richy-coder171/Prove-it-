import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, Check, ShieldAlert } from 'lucide-react';
import { api, getApiError } from '../lib/api.js';

export default function Leaderboard() {
  const { id } = useParams(); const [reviewOnly, setReviewOnly] = useState(false); const [shortOnly, setShortOnly] = useState(false); const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['leaderboard', id], queryFn: async () => (await api.get(`/challenges/${id}/leaderboard`)).data.data, refetchInterval: 5000 });
  const shortlist = useMutation({ mutationFn: async ({ submissionId, status }) => status ? api.post('/shortlist', { submissionId, status }) : api.delete(`/shortlist/${submissionId}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaderboard', id] }) });
  if (query.isPending) return <main className="workspace-page"><p role="status">Loading the leaderboard…</p></main>;
  if (query.isError) return <main className="workspace-page"><p role="alert">{getApiError(query.error)}</p></main>;
  const { challenge, rows } = query.data;
  const visible = rows.filter((row) => (!reviewOnly || row.needsHumanReview) && (!shortOnly || row.shortlist));
  return <main className="leaderboard-page">
    <Link className="text-link" to={`/startup/challenges/${id}/review`}><ArrowLeft size={14} /> Challenge</Link>
    <div className="leaderboard-heading"><div><p className="eyebrow">Live results · refreshes every five seconds</p><h1>{challenge.title}</h1><p>{challenge.skill} · {rows.length} completed {rows.length === 1 ? 'submission' : 'submissions'}</p><Link className="text-link" to={`/startup/challenges/${id}/matches`}>Find other matching candidates <ArrowUpRight size={13} /></Link></div><div className="leaderboard-filters"><label><input type="checkbox" checked={shortOnly} onChange={(event) => setShortOnly(event.target.checked)} /> Shortlisted</label><label><input type="checkbox" checked={reviewOnly} onChange={(event) => setReviewOnly(event.target.checked)} /> Needs review</label></div></div>
    {visible.length === 0 ? <section className="empty-leaderboard"><h2>No completed results yet.</h2><p>Share your challenge link to invite candidates.</p></section> : <section className="leaderboard-list">{visible.map((row) => <article className="leaderboard-row" key={row.submissionId}>
      <span className="leaderboard-rank">{String(row.rank).padStart(2, '0')}</span><div className="leaderboard-candidate"><Link to={`/startup/submissions/${row.submissionId}`}><strong>{row.candidate?.fullName ?? 'Candidate'}</strong><ArrowUpRight size={14} /></Link><span>{row.candidate?.headline || row.candidate?.skills?.slice(0, 3).join(' · ') || 'Candidate result'}</span></div><div className="leaderboard-score"><strong>{Math.round(row.total)}</strong><span>/100 · reasoning {Number(row.reasoningScore).toFixed(0)}</span></div><span className={`confidence confidence-${row.authenticity}`}>{row.authenticity} confidence</span>{row.needsHumanReview && <span className="review-flag"><ShieldAlert size={14} /> Review</span>}{row.mentorEndorsed && <span className="mentor-mark">Mentor endorsed</span>}<button className={`shortlist-button ${row.shortlist ? 'is-shortlisted' : ''}`} onClick={() => shortlist.mutate({ submissionId: row.submissionId, status: row.shortlist ? null : 'shortlisted' })}>{row.shortlist ? <><Check size={14} /> {row.shortlist}</> : 'Shortlist'}</button>
    </article>)}</section>}
  </main>;
}
