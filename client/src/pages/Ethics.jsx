import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";

const principles = [
  [
    "People stay in charge",
    "AI can help shape a challenge or organize feedback. A human reviews every challenge before it goes live, can override a score, and makes the final decision.",
  ],
  [
    "Work is the signal",
    "Only the candidate’s written work and answer transcripts are assessed. We do not evaluate faces, voice tone, accent, appearance, or demographics.",
  ],
  [
    "Scores come with context",
    "Each criterion includes a plain-language reason and evidence connected to the candidate’s answer. Candidates can request a human re-review.",
  ],
  [
    "Confidence is a guide",
    "The authenticity signal describes confidence that an explanation matches the submitted work. It is advisory and never an accusation.",
  ],
  [
    "Your recording stays private",
    "Only a candidate and the authorized review team can access audio or transcripts. Candidates can delete stored audio; the transcript stays attached to the scored work.",
  ],
];

export default function Ethics() {
  return (
    <main className="ethics-page">
      <section className="ethics-hero">
        <div>
          <p className="eyebrow">
            <ShieldCheck size={15} /> Our principles
          </p>
          <h1>
            More thoughtful
            <br />
            by <em>design.</em>
          </h1>
          <p>
            Trust comes from showing how a decision was reached and keeping
            people responsible for the decisions they make.
          </p>
        </div>
        <span className="ethics-seal">
          <ShieldCheck />
          <span>
            People
            <br />
            first
          </span>
        </span>
      </section>
      <section className="ethics-list">
        {principles.map(([title, copy], index) => (
          <article key={title}>
            <span className="ethics-number">0{index + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{copy}</p>
            </div>
            <Check className="ethics-check" />
          </article>
        ))}
      </section>
      <section className="ethics-note">
        <p className="eyebrow">A work in progress</p>
        <p>
          Some hiring uses may trigger requirements under rules such as the EU
          AI Act or New York City Local Law 144. The scope depends on the system
          and its use. ProveIt is designed with fairness, explainability, and
          human review in mind; this is not a claim of legal compliance.
          Submitted work and transcripts need a clear retention schedule from
          the organization running the challenge.
        </p>
        <a
          href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
          target="_blank"
          rel="noreferrer"
        >
          EU AI Act <ArrowUpRight size={15} />
        </a>
        <a
          href="https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page"
          target="_blank"
          rel="noreferrer"
        >
          NYC DCWP rules <ArrowUpRight size={15} />
        </a>
        <a href="mailto:hello@proveit.example">
          Share feedback <ArrowUpRight size={15} />
        </a>
      </section>
    </main>
  );
}
