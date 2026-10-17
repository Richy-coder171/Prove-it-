import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronLeft, ChevronRight, Quote, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const perspectives = [
  { copy: 'A good challenge asks for a real decision, then makes room for the reasoning behind it.', audience: 'For hiring teams', title: 'A more useful signal' },
  { copy: 'Your work gets more attention when you can explain the choices behind it.', audience: 'For candidates', title: 'A chance to show your thinking' },
  { copy: 'A human can see the evidence, understand the context, and make the call.', audience: 'For mentors', title: 'Room for thoughtful judgment' },
];

const steps = [
  { title: 'Start with real work', copy: 'A role or an idea becomes a short, practical challenge shaped around what the work actually asks of someone.', icon: <Sparkles /> },
  { title: 'Hear the reasoning', copy: 'Candidates explain the choices behind their solution. Follow-ups respond to their actual work, not a generic script.', icon: <Quote /> },
  { title: 'See the evidence', copy: 'A clear rubric ties each score to an answer. People stay in charge of every shortlist and final decision.', icon: <BadgeCheck /> },
  { title: 'Build what comes next', copy: 'Skills, introductions, and verified work can turn one thoughtful assessment into a genuine opportunity.', icon: <UsersRound /> },
];

const accordionItems = [
  { title: 'Hiring', copy: 'See how someone approaches the work before you meet them.', image: 'https://picsum.photos/seed/proveit-hiring/1000/1200', alt: 'Sunlit studio table prepared for collaborative work' },
  { title: 'Founder mode', copy: 'Find the people who can make thoughtful decisions with you.', image: 'https://picsum.photos/seed/proveit-founders/1000/1200', alt: 'Small team sharing ideas around a worktable' },
  { title: 'Candidate growth', copy: 'Turn specific feedback into a clear next step.', image: 'https://picsum.photos/seed/proveit-growth/1000/1200', alt: 'Notebook and laptop on a quiet desk' },
];

export default function Landing() {
  const root = useRef(null);
  const experience = useRef(null);
  const cards = useRef(null);
  const [activePerspective, setActivePerspective] = useState(0);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.hero-copy > *', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, stagger: 0.1, ease: 'power3.out' });
      gsap.to('.hero-photo', { scale: 1, opacity: 0.58, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.7 } });
      if (cards.current) {
        gsap.fromTo(cards.current.querySelectorAll('.stack-card'), { y: 64, scale: 0.94, opacity: 0.72 }, {
          y: (index) => index * -13, scale: 1, opacity: 1, stagger: 0.12, ease: 'none',
          scrollTrigger: { trigger: cards.current, start: 'top 78%', end: 'bottom 40%', scrub: 0.8 },
        });
      }
      experience.current?.querySelectorAll('.accordion-image').forEach((image) => {
        const timeline = gsap.timeline({ scrollTrigger: { trigger: image, start: 'top bottom', end: 'bottom top', scrub: 0.7 } });
        timeline.fromTo(image, { scale: 0.8, opacity: 0.2 }, { scale: 1, opacity: 1, duration: 0.55 }).to(image, { scale: 0.96, opacity: 0.2, duration: 0.45 });
      });
    });
    return () => media.revert();
  }, { scope: root });

  const perspective = perspectives[activePerspective];
  const changePerspective = (direction) => setActivePerspective((index) => (index + direction + perspectives.length) % perspectives.length);

  return <main className="page-main" ref={root}>
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero-photo" aria-hidden="true" />
      <div className="hero-grain" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> A better way to meet the people behind the work</p>
        <h1 id="hero-heading">Anyone can write an answer.<br /><em>Can they defend it?</em></h1>
        <p className="hero-description">ProveIt brings real-world challenges and thoughtful follow-ups together, so good work can speak for itself.</p>
        <div className="hero-actions"><Link className="button button-acid" to="/register?role=startup">I’m hiring <ArrowUpRight size={17} /></Link><Link className="button button-ghost" to="/register?role=candidate">I’m a candidate <ArrowRight size={17} /></Link></div>
      </div>
      <a className="hero-scroll" href="#how-it-works"><span>See how it works</span><ArrowDown size={15} /></a>
      <div className="hero-caption"><span>Work speaks. People decide.</span><span>ProveIt, in practice</span></div>
    </section>

    <section className="intro-section section-pad" id="how-it-works">
      <div className="section-heading"><p className="eyebrow">A clearer signal</p><h2>Past the pitch.<br /><span>Closer to the work.</span></h2></div>
      <div className="intro-aside"><p>Hiring should make room for the way people think, not just the way they present. ProveIt gives candidates something real to solve, then asks them to walk you through it.</p><a className="text-link" href="#the-process">A little more about the process <ArrowDown size={15} /></a></div>
    </section>

    <section className="process-section section-pad" id="the-process">
      <div className="process-heading"><div><p className="eyebrow">From first prompt to next step</p><h2>Let the work<br />lead the way.</h2></div><p>Every part of the experience has one job: help people make a better, more human decision.</p></div>
      <div className="bento-grid" ref={cards}>
        {steps.map((step, index) => <article className={`process-card process-card-${index + 1} stack-card`} key={step.title}>
          <div className="process-card-top"><span className="process-icon">{step.icon}</span></div>
          <h3>{step.title}</h3><p>{step.copy}</p>
          {index === 1 && <div className="answer-sample"><span>“I chose the smaller batch size because…”</span><span className="answer-line" /></div>}
          {index === 2 && <div className="evidence-sample"><span><Check size={14} /> Evidence linked to the answer</span><div><i /><i /><i /></div></div>}
          {index === 3 && <div className="people-sample"><span>MP</span><span>JL</span><span>+1</span></div>}
        </article>)}
      </div>
      <div className="process-footnote"><span>Thoughtful by design</span><span>AI can help structure the work. Humans make the call.</span></div>
    </section>

    <section className="experience-section section-pad" ref={experience}>
      <div className="experience-heading"><p className="eyebrow">One idea, a few good ways forward</p><h2>Make space for<br />what’s next.</h2><p className="experience-deck">A role, a new venture, a skill in progress. The same clear process makes room for different kinds of potential.</p></div>
      <div className="accordion-list" aria-label="Explore ProveIt experiences">
        {accordionItems.map((item, index) => <article className={`accordion-item ${index === 0 ? 'is-active' : ''}`} key={item.title}>
          <img className="accordion-image" src={item.image} alt={item.alt} />
          <div className="accordion-overlay" />
          <div className="accordion-content"><div><h3>{item.title}</h3><p>{item.copy}</p></div><ArrowUpRight className="accordion-arrow" size={20} /></div>
        </article>)}
      </div>
    </section>

    <section className="marquee-section" aria-label="The ProveIt approach"><div className="marquee-track"><span>Real work</span><i>+</i><span>Clear evidence</span><i>+</i><span>Human judgment</span><i>+</i><span>Real work</span><i>+</i><span>Clear evidence</span><i>+</i><span>Human judgment</span><i>+</i></div></section>

    <section className="trust-section section-pad">
      <div className="trust-copy"><p className="eyebrow">Trust has to be earned</p><h2>More context.<br /><span>Less guesswork.</span></h2><p>Scores come with reasons and evidence from the candidate’s own work. AI can help organize what’s there; it can’t make the hiring decision.</p><Link className="text-link" to="/ethics">Read how we think about fairness <ArrowUpRight size={15} /></Link></div>
      <div className="trust-points"><div><span className="trust-icon"><ShieldCheck /></span><div><h3>Human decisions stay human</h3><p>Every score can be reviewed and overridden by the people responsible for hiring.</p></div></div><div><span className="trust-icon"><Quote /></span><div><h3>Evidence over impression</h3><p>See the reasoning and the answer behind a score, with a path to request another look.</p></div></div><div><span className="trust-icon"><BadgeCheck /></span><div><h3>Confidence, with care</h3><p>Authenticity is an advisory confidence signal, never an accusation or a measure of a person.</p></div></div></div>
    </section>

    <section className="quote-section section-pad" aria-live="polite">
      <div className="quote-mark"><Quote size={27} /></div><p className="eyebrow">The conversation we want to make possible</p><blockquote>{perspective.copy}</blockquote>
      <div className="quote-meta"><div className="quote-person"><div><strong>{perspective.audience}</strong><span>{perspective.title}</span></div></div><div className="quote-controls"><button aria-label="Previous perspective" onClick={() => changePerspective(-1)}><ChevronLeft /></button><button aria-label="Next perspective" onClick={() => changePerspective(1)}><ChevronRight /></button></div></div>
    </section>

    <section className="final-cta"><div className="cta-orbit cta-orbit-one" /><div className="cta-orbit cta-orbit-two" /><div className="cta-content"><p className="eyebrow">A better conversation starts here</p><h2>See what people<br /><em>can really do.</em></h2><Link to="/register" className="button button-acid">Get started <ArrowUpRight size={17} /></Link><p className="cta-note">For early teams, curious candidates, and people building something new.</p></div></section>
  </main>;
}
