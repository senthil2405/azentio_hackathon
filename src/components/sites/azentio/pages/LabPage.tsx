import Link from "next/link";

export function LabPage() {
  return (
    <>
      <section className="page-hero">
      <div className="container">
      <div className="eyebrow">
      AI LAB
      </div>
      <h1>
      Experiment Boldly. Engineer Purposefully.
      </h1>
      <p>
      Where emerging technologies meet practical challenges. We experiment, prototype, validate, and refine ideas.
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
      Inside the Lab
      </h2>
      <p>
      Explore how we approach rapid prototyping and real-world experimentation.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      02
      </span>
      <h2>
      What We’re Exploring
      </h2>
      <p>
      Agentic AI, small language models, multimodal intelligence, and AI-assisted engineering.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      03
      </span>
      <h2>
      Build Stories
      </h2>
      <p>
      From problem statements and experiments to working prototypes and lessons learned.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      04
      </span>
      <h2>
      Hackathons & Collaboration
      </h2>
      <p>
      Innovation challenges, working sessions, and opportunities to build together.
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
