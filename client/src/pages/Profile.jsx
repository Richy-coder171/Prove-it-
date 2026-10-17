import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { api, getApiError } from '../lib/api.js';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth(); const client = useQueryClient();
  const query = useQuery({ queryKey: ['my-badges'], queryFn: async () => (await api.get('/badges/mine')).data.data.badges });
  async function update(badge, change) {
    await api.patch(`/badges/${badge.verificationId}/visibility`, { isPublic: change.isPublic ?? badge.isPublic, showBreakdownPublicly: change.showBreakdownPublicly ?? badge.showBreakdownPublicly });
    await client.invalidateQueries({ queryKey: ['my-badges'] });
  }
  if (query.isPending) return <main className="profile-page"><p role="status">Loading profile settings…</p></main>;
  if (query.isError) return <main className="profile-page"><p role="alert">{getApiError(query.error)}</p></main>;
  return <main className="profile-page"><p className="eyebrow">Your candidate profile</p><h1>{user?.fullName}</h1><p className="profile-bio">Manage what appears on your public profile.</p><Link className="text-link" to={`/u/${user?.slug}`}>View public profile</Link><section className="profile-badges"><p className="eyebrow">Badge visibility</p><h2>Your verified work</h2>{query.data.length ? query.data.map((badge) => <article className="profile-badge-setting" key={badge.verificationId}><div><strong>{badge.skill} · {badge.level}</strong><span>{badge.verificationId} · {badge.revoked ? 'revoked' : `${Math.round(badge.score)} / 100`}</span>{badge.isPublic && <Link to={`/badge/${badge.verificationId}`}>Open verification page</Link>}</div><label><input type="checkbox" checked={badge.isPublic} onChange={(event) => void update(badge, { isPublic: event.target.checked })} /> Public</label><label><input type="checkbox" checked={badge.showBreakdownPublicly} disabled={!badge.isPublic} onChange={(event) => void update(badge, { showBreakdownPublicly: event.target.checked })} /> Show score breakdown</label></article>) : <p>Badges appear here after a scored attempt.</p>}</section></main>;
}
