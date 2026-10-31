import Link from "next/link";

export function SolutionsPage() {
  return (
    <>
      <section className="page-hero">
      <div className="container">
      <div className="eyebrow">
      SOLUTIONS
      </div>
      <h1>
      Real Challenges. Intelligent Solutions.
      </h1>
      <p>
      Practical intelligence for financial services and complex enterprise workflows.
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
      Smarter Credit Decisions
      </h2>
      <p>
      Improve transparency and efficiency across credit assessment.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      02
      </span>
      <h2>
      Adaptive Credit Strategies
      </h2>
      <p>
      Evaluate policy scenarios before implementation.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      03
      </span>
      <h2>
      Intelligent Reporting
      </h2>
      <p>
      Simplify data mapping, validation, and reporting preparation.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      04
      </span>
      <h2>
      Portfolio Intelligence
      </h2>
      <p>
      Use historical patterns to strengthen decision context.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      05
      </span>
      <h2>
      Operational Intelligence
      </h2>
      <p>
      Connect fragmented information and repetitive workflows.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      06
      </span>
      <h2>
      Knowledge & Content Intelligence
      </h2>
      <p>
      Turn information into relevant, contextual outputs.
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
