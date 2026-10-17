import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { api, getApiError } from '../lib/api.js';

export default function Opportunities() {
  const query = useQuery({ queryKey: ['opportunities'], queryFn: async () => (await api.get('/opportunities/match')).data.data.opportunities });
  if (query.isPending) return <main className="opportunities-page"><p role="status">Finding relevant opportunities…</p></main>;
  if (query.isError) return <main className="opportunities-page"><p role="alert">{getApiError(query.error)}</p></main>;
  return <main className="opportunities-page"><p className="eyebrow"><Sparkles size={14} /> Matched to your skills</p><h1>Work worth a closer look.</h1><p className="opportunities-intro">Each match includes the skills that connected it to your profile.</p><section className="opportunity-list">{query.data.length ? query.data.map((item) => <article key={item.id}><div><p className="eyebrow">{item.kind?.replace('_', ' ')} · {item.org}</p><h2>{item.title}</h2><p>{item.description}</p><span>{item.whyMatched}</span><div className="opportunity-tags">{item.tags?.slice(0, 5).map((tag) => <small key={tag}>{tag}</small>)}</div></div><div className="opportunity-action"><strong>{item.matchScore}% match</strong>{item.url ? <Link className="button button-dark" to={item.url}>View challenge <ArrowUpRight size={14} /></Link> : <span>Opportunity details coming soon</span>}</div></article>) : <p>No opportunities match your profile yet. Add skills to improve your matches.</p>}</section></main>;
}
