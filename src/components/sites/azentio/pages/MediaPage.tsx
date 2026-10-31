import Link from "next/link";

export function MediaPage() {
  return (
    <>
      <section className="page-hero">
      <div className="container">
      <div className="eyebrow">
      MEDIA & VIDEOS
      </div>
      <h1>
      See the Thinking.
      <br />
      Experience the Technology.
      </h1>
      <p>
      Product demonstrations, explainers, engineering stories, and ideas in motion.
      </p>
      </div>
      </section>
      <section className="section container">
      <div className="video-grid">
      <article className="video-card">
      <div className="video-thumb art-0">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play">
      <polygon points="6 3 20 12 6 21 6 3" />
      </svg>
      <span>
      VIDEO COMING SOON
      </span>
      </div>
      <div className="video-info">
      <span className="eyebrow">
      Brand
      </span>
      <h3>
      The azentio.ai Story
      </h3>
      <p>
      Introducing our approach to applied AI.
      </p>
      </div>
      </article>
      <article className="video-card">
      <div className="video-thumb art-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play">
      <polygon points="6 3 20 12 6 21 6 3" />
      </svg>
      <span>
      VIDEO COMING SOON
      </span>
      </div>
      <div className="video-info">
      <span className="eyebrow">
      Products
      </span>
      <h3>
      Product Showreel
      </h3>
      <p>
      An overview of intelligent products in action.
      </p>
      </div>
      </article>
      <article className="video-card">
      <div className="video-thumb art-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play">
      <polygon points="6 3 20 12 6 21 6 3" />
      </svg>
      <span>
      VIDEO COMING SOON
      </span>
      </div>
      <div className="video-info">
      <span className="eyebrow">
      Product Demo
      </span>
      <h3>
      Credit Decisioning Deep Dive
      </h3>
      <p>
      Explore evidence-backed credit decisioning.
      </p>
      </div>
      </article>
      <article className="video-card">
      <div className="video-thumb art-3">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play">
      <polygon points="6 3 20 12 6 21 6 3" />
      </svg>
      <span>
      VIDEO COMING SOON
      </span>
      </div>
      <div className="video-info">
      <span className="eyebrow">
      AI Lab
      </span>
      <h3>
      Inside the AI Lab
      </h3>
      <p>
      Experiments, prototypes, and lessons learned.
      </p>
      </div>
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
