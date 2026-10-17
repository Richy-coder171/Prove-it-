import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Copy, ShieldCheck, ShieldX } from 'lucide-react';
import { api, getApiError } from '../lib/api.js';

export default function BadgePage() {
  const { vid } = useParams(); const [copied, setCopied] = useState(false);
  const query = useQuery({ queryKey: ['badge', vid], queryFn: async () => (await api.get(`/badges/${vid}`)).data.data, retry: false });
  const url = `${window.location.origin}/badge/${vid}`;
  async function copy() { await navigator.clipboard.writeText(url); setCopied(true); }
  if (query.isPending) return <main className="badge-page"><p role="status">Checking signature…</p></main>;
  if (query.isError) return <main className="badge-page"><div className="badge-verify invalid"><ShieldX /><h1>Could not verify this badge</h1><p>{getApiError(query.error)}</p></div></main>;
  const badge = query.data;
  if (!badge.verified) return <main className="badge-page"><div className="badge-verify invalid"><ShieldX /><h1>Could not verify this badge</h1><p>We could not confirm this badge’s signed details.</p></div></main>;
  return <main className="badge-page"><section className="badge-card"><div className="badge-verify"><ShieldCheck /><span>{badge.message}</span></div><p className="eyebrow">Verified work · {badge.verificationId}</p><h1>{badge.skill}</h1><p className="badge-candidate">{badge.candidate} · {badge.level}</p><div className="badge-score"><strong>{Math.round(badge.score)}</strong><span>/100</span></div><div className="badge-meta"><span>{badge.challenge}</span><span>{badge.authenticity} confidence</span><span>Attempt {badge.attempt}</span><span>Issued {new Date(badge.issuedAt).toLocaleDateString()}</span></div>{badge.endorsement && <blockquote className="badge-endorsement">“{badge.endorsement.text}”<span>Mentor rating · {badge.endorsement.rating}/5</span></blockquote>}{badge.breakdown?.length > 0 && <section className="badge-breakdown"><h2>Rubric breakdown</h2>{badge.breakdown.map((item) => <article key={item.name}><div><strong>{item.name}</strong><span>{item.score}/{item.max}</span></div><p>{item.why}</p></article>)}</section>}<div className="badge-share"><QRCodeSVG value={url} size={112} level="M" includeMargin /><div><button className="button button-dark" onClick={copy}><Copy size={14} /> {copied ? 'Link copied' : 'Copy verification link'}</button><a className="text-link" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}>Share to LinkedIn</a></div></div></section><Link className="text-link" to={badge.profile ? `/u/${badge.profile}` : '/'}><CheckCircle2 size={14} /> View candidate profile</Link></main>;
}
