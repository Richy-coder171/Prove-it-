import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react';

const principles = [
  ['People stay in charge', 'AI can help shape a challenge or organize feedback. A human reviews every challenge before it goes live, can override a score, and makes the final decision.'],
  ['Work is the signal', 'Only the candidate’s written work and answer transcripts are assessed. We do not evaluate faces, voice tone, accent, appearance, or demographics.'],
  ['Scores come with context', 'Each criterion includes a plain-language reason and evidence connected to the candidate’s answer. Candidates can request a human re-review.'],
  ['Confidence is a guide', 'The authenticity signal describes confidence that an explanation matches the submitted work. It is advisory and never an accusation.'],
];

export default function Ethics() {
  return <main className="ethics-page"><section className="ethics-hero"><div><p className="eyebrow"><ShieldCheck size={15} /> Our principles</p><h1>More thoughtful<br />by <em>design.</em></h1><p>Trust comes from showing how a decision was reached and keeping people responsible for the decisions they make.</p></div><span className="ethics-seal"><ShieldCheck /><span>People<br />first</span></span></section><section className="ethics-list">{principles.map(([title, copy], index) => <article key={title}><span className="ethics-number">0{index + 1}</span><div><h2>{title}</h2><p>{copy}</p></div><Check className="ethics-check" /></article>)}</section><section className="ethics-note"><p className="eyebrow">A work in progress</p><p>Hiring technology can affect people’s access to work. ProveIt is designed with fairness, explainability, and human review in mind. This is not a claim of legal compliance. We’ll keep reviewing how the product is built and used.</p><a href="mailto:hello@proveit.example">Share feedback <ArrowUpRight size={15} /></a></section></main>;
}
