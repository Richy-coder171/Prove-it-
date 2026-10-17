import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { api, getApiError } from '../lib/api.js';

export default function PublicProfile() {
  const { slug } = useParams();
  const query = useQuery({ queryKey: ['public-profile', slug], queryFn: async () => (await api.get(`/users/${slug}`)).data.data, retry: false });
  if (query.isPending) return <main className="profile-page"><p role="status">Opening profile…</p></main>;
  if (query.isError) return <main className="profile-page"><p role="alert">{getApiError(query.error)}</p></main>;
  const { profile, badges } = query.data;
  return <main className="profile-page"><p className="eyebrow">ProveIt candidate profile</p><h1>{profile.fullName}</h1>{profile.headline && <h2>{profile.headline}</h2>}{profile.bio && <p className="profile-bio">{profile.bio}</p>}<div className="profile-skills">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><section className="profile-badges"><p className="eyebrow">Verified work</p><h2>Proof in practice</h2>{badges.length ? <div>{badges.map((badge) => <Link to={`/badge/${badge.verificationId}`} key={badge.verificationId}><span>{badge.skill} · {badge.level}</span><strong>{Math.round(badge.score)} / 100</strong><small>{badge.authenticity} confidence · attempt {badge.attempt}</small><ArrowUpRight size={15} /></Link>)}</div> : <p>No public badges yet.</p>}</section></main>;
}
