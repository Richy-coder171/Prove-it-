import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BadgeCheck } from 'lucide-react';
import { api, getApiError } from '../lib/api.js';

export default function VentureCard() {
  const { id } = useParams(); const query = useQuery({ queryKey: ['venture', id], queryFn: async () => (await api.get(`/ventures/${id}`)).data.data.venture, retry: false });
  if (query.isPending) return <main className="venture-card-page"><p role="status">Verifying team badges…</p></main>;
  if (query.isError) return <main className="venture-card-page"><p role="alert">{getApiError(query.error)}</p></main>;
  const venture = query.data;
  return <main className="venture-card-page"><p className="eyebrow">ProveIt Venture Card</p><h1>{venture.name}</h1><p className="venture-oneliner">{venture.oneLiner}</p>{venture.challenge && <p className="eyebrow">Built from: {venture.challenge}</p>}<section className="venture-members"><div className="venture-members-heading"><div><p className="eyebrow">Verified team</p><h2>People behind the work.</h2></div>{venture.mentorConnected && <span><BadgeCheck size={16} /> Mentor connected</span>}</div>{venture.members.length ? venture.members.map((member) => <article key={`${member.name}-${member.skill}`}><BadgeCheck size={18} /><div><h3>{member.name}</h3><p>{member.skill} · verified score {Math.round(member.score)}</p>{member.endorsement && <blockquote>“{member.endorsement.text}”</blockquote>}{member.profile && <Link to={`/u/${member.profile}`}>Candidate profile <ArrowUpRight size={13} /></Link>}</div><Link className="button button-outline" to={member.badgeUrl}>View badge</Link></article>) : <p>No public verified members are attached to this Venture Card.</p>}</section></main>;
}
