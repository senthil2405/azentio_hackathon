import Link from "next/link";

export function AboutPage() {
  return (
    <>
      <section className="page-hero">
      <div className="container">
      <div className="eyebrow">
      ABOUT azentio.ai
      </div>
      <h1>
      Built on Curiosity. Driven by Purpose.
      </h1>
      <p>
      We combine domain understanding, product thinking, AI engineering, and a culture of experimentation to build intelligent solutions.
      </p>
      </div>
      </section>
      <section className="section container">
      <div className="info-grid">
      <article className="info-card">
      <span className="eyebrow">
      01
      </span>
      <h2>
      Our Mission
      </h2>
      <p>
      Engineer practical, responsible, and impactful AI products that simplify complexity and enable better decisions.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      02
      </span>
      <h2>
      Our Vision
      </h2>
      <p>
      A future where intelligence is seamlessly embedded into everyday enterprise experiences.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      03
      </span>
      <h2>
      Build with Purpose
      </h2>
      <p>
      Start with real problems and measure meaningful outcomes.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      04
      </span>
      <h2>
      Engineer for Trust
      </h2>
      <p>
      Make security, accountability, and human oversight foundational.
      </p>
      </article>
      </div>
      </section>
      <section className="container cta">
      <div className="glow">
      </div>
      <div className="eyebrow">
      BUILD WHAT&apos;S NEXT
      </div>
      <h2>
      The Next Intelligent Idea Starts Here.
      </h2>
      <p>
      Explore our products, share a challenge, or collaborate to turn ambitious ideas into working AI solutions.
      </p>
      <Link className="btn" href="/connect/">
      Start a Conversation{" "}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
      </svg>
      </Link>
      </section>
    </>
  );
}
