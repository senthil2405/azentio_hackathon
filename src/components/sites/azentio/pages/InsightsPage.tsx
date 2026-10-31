import Link from "next/link";

export function InsightsPage() {
  return (
    <>
      <section className="page-hero">
      <div className="container">
      <div className="eyebrow">
      INSIGHTS
      </div>
      <h1>
      Ideas Worth Exploring. Perspectives Worth Sharing.
      </h1>
      <p>
      Practical thinking on applied AI, engineering, product innovation, and responsible enterprise intelligence.
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
      Why Explainability Matters in Credit Decisions
      </h2>
      <p>
      How evidence, oversight, and transparent recommendations shape responsible decision support.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      02
      </span>
      <h2>
      From Reporting Automation to Intelligence
      </h2>
      <p>
      Moving beyond templates to configurable, validated, and traceable reporting.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      03
      </span>
      <h2>
      Small Language Models in Financial Services
      </h2>
      <p>
      Considerations for privacy, performance, deployment, and governance.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      04
      </span>
      <h2>
      Engineering Notes
      </h2>
      <p>
      Lessons from experiments, prototypes, and production-oriented design.
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
