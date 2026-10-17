import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, getApiError } from '../lib/api.js';

export default function VentureCreate() {
  const [params] = useSearchParams(); const challengeId = params.get('challengeId'); const navigate = useNavigate();
  const [name, setName] = useState(''); const [oneLiner, setOneLiner] = useState(''); const [submissionIds, setSubmissionIds] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const leaderboard = useQuery({ queryKey: ['leaderboard', challengeId], queryFn: async () => (await api.get(`/challenges/${challengeId}/leaderboard`)).data.data.rows, enabled: Boolean(challengeId) });
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const { data } = await api.post('/ventures', { challengeId, name, oneLiner, submissionIds }); navigate(`/venture/${data.data.venture.id}`); }
    catch (reason) { setError(getApiError(reason)); }
    finally { setBusy(false); }
  }
  return <main className="workspace-page venture-create"><p className="eyebrow">Founder Mode · verified team</p><h1>Make the next step visible.</h1><p>Create a Venture Card from this founder challenge and teammates with publicly verified badges. At least one badge needs a mentor endorsement.</p><form onSubmit={submit}><label>Venture name<input required minLength="2" maxLength="120" value={name} onChange={(event) => setName(event.target.value)} /></label><label>One line about the venture<textarea required minLength="10" maxLength="300" value={oneLiner} onChange={(event) => setOneLiner(event.target.value)} /></label><fieldset className="venture-member-picker"><legend>Choose verified team members</legend>{leaderboard.isPending ? <p>Loading completed founder challenge submissions…</p> : leaderboard.isError ? <p>{getApiError(leaderboard.error)}</p> : leaderboard.data.filter((row) => row.mentorEndorsed).map((row) => <label key={row.submissionId}><input type="checkbox" checked={submissionIds.includes(row.submissionId)} onChange={(event) => setSubmissionIds((items) => event.target.checked ? [...items, row.submissionId] : items.filter((item) => item !== row.submissionId))} /><span>{row.candidate.fullName} · {Math.round(row.total)} · mentor endorsed</span></label>)}{leaderboard.data?.length === 0 && <p>No completed submissions yet.</p>}</fieldset>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" disabled={busy || !challengeId || !submissionIds.length}>{busy ? 'Creating…' : 'Create Venture Card'}</button></form></main>;
}
