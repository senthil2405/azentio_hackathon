import Link from "next/link";
import { HomeCarousel } from "../HomeCarousel";

export function HomePage() {
  return (
    <>
      <div data-home-scroll="true">
      <HomeCarousel />
      <section className="section container">
      <div className="section-intro">
      <div className="eyebrow">
      WHO WE ARE
      </div>
      <h2>
      Intelligence, Engineered
      <br />
      for the Real World.
      </h2>
      <p>
      AI creates value when it moves beyond experimentation and becomes part of how businesses operate. We build intelligent applications combining domain understanding, advanced AI, intuitive experiences, and enterprise-grade engineering.
      </p>
      </div>
      </section>
      <section className="section section-muted">
      <div className="container">
      <div className="section-head">
      <div>
      <div className="eyebrow">
      WHAT WE DO
      </div>
      <h2>
      Intelligence in Every Layer.
      </h2>
      </div>
      <p>
      Capabilities designed to connect information, intelligence, and action.
      </p>
      </div>
      <div className="cap-grid">
      <button type="button" className="cap-flip " aria-pressed="false" aria-label="Intelligent Decisioning: Turn policies, evidence, and data into informed recommendations. Activate to preview">
      <span className="cap-flip-inner">
      <span className="cap-face cap-front" aria-hidden="false">
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M9 13a4.5 4.5 0 0 0 3-4" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M12 13h4" />
      <path d="M12 18h6a2 2 0 0 1 2 2v1" />
      <path d="M12 8h8" />
      <path d="M16 8V5a2 2 0 0 1 2-2" />
      <circle cx="16" cy="13" r=".5" />
      <circle cx="18" cy="3" r=".5" />
      <circle cx="20" cy="21" r=".5" />
      <circle cx="20" cy="8" r=".5" />
      </svg>
      <strong>
      Intelligent Decisioning
      </strong>
      <span>
      Turn policies, evidence, and data into informed recommendations.
      </span>
      <small>
      Hover or tap to explore ↗
      </small>
      </span>
      <span className="cap-face cap-back" aria-hidden="true">
      <strong>
      Intelligent Decisioning
      </strong>
      <span className="cap-subtitle">
      Policy to recommendation
      </span>
      <span className="cap-points" role="list">
      <span className="cap-point" role="listitem">
      Evaluate applications vs. configurable policies
      </span>
      <span className="cap-point" role="listitem">
      Analyze risk, financial data & historical patterns
      </span>
      <span className="cap-point" role="listitem">
      Simulate policy changes
      </span>
      <span className="cap-point" role="listitem">
      Evidence-backed recommendations
      </span>
      </span>
      </span>
      </span>
      </button>
      <button type="button" className="cap-flip " aria-pressed="false" aria-label="Document Intelligence: Extract, interpret, and validate complex information. Activate to preview">
      <span className="cap-flip-inner">
      <span className="cap-face cap-front" aria-hidden="false">
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-search">
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" />
      <path d="m9 18-1.5-1.5" />
      <circle cx="5" cy="14" r="3" />
      </svg>
      <strong>
      Document Intelligence
      </strong>
      <span>
      Extract, interpret, and validate complex information.
      </span>
      <small>
      Hover or tap to explore ↗
      </small>
      </span>
      <span className="cap-face cap-back" aria-hidden="true">
      <strong>
      Document Intelligence
      </strong>
      <span className="cap-subtitle">
      Documents to structured data
      </span>
      <span className="cap-points" role="list">
      <span className="cap-point" role="listitem">
      Classify & extract information
      </span>
      <span className="cap-point" role="listitem">
      Validate across documents
      </span>
      <span className="cap-point" role="listitem">
      Detect inconsistencies
      </span>
      <span className="cap-point" role="listitem">
      Deliver structured data
      </span>
      </span>
      </span>
      </span>
      </button>
      <button type="button" className="cap-flip " aria-pressed="false" aria-label="AI Agents & Automation: Connect intelligence with workflows and human oversight. Activate to preview">
      <span className="cap-flip-inner">
      <span className="cap-face cap-front" aria-hidden="false">
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-workflow">
      <rect width="8" height="8" x="3" y="3" rx="2" />
      <path d="M7 11v4a2 2 0 0 0 2 2h4" />
      <rect width="8" height="8" x="13" y="13" rx="2" />
      </svg>
      <strong>
      AI Agents & Automation
      </strong>
      <span>
      Connect intelligence with workflows and human oversight.
      </span>
      <small>
      Hover or tap to explore ↗
      </small>
      </span>
      <span className="cap-face cap-back" aria-hidden="true">
      <strong>
      AI Agents & Automation
      </strong>
      <span className="cap-subtitle">
      Tasks to connected workflows
      </span>
      <span className="cap-points" role="list">
      <span className="cap-point" role="listitem">
      Interpret tasks
      </span>
      <span className="cap-point" role="listitem">
      Coordinate connected workflows
      </span>
      <span className="cap-point" role="listitem">
      Automate multi-step activities
      </span>
      <span className="cap-point" role="listitem">
      Human approvals & audit trails
      </span>
      </span>
      </span>
      </span>
      </button>
      <button type="button" className="cap-flip " aria-pressed="false" aria-label="Analytics & Insights: Transform data into actionable intelligence. Activate to preview">
      <span className="cap-flip-inner">
      <span className="cap-face cap-front" aria-hidden="false">
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-no-axes-combined">
      <path d="M12 16v5" />
      <path d="M16 14v7" />
      <path d="M20 10v11" />
      <path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" />
      <path d="M4 18v3" />
      <path d="M8 14v7" />
      </svg>
      <strong>
      Analytics & Insights
      </strong>
      <span>
      Transform data into actionable intelligence.
      </span>
      <small>
      Hover or tap to explore ↗
      </small>
      </span>
      <span className="cap-face cap-back" aria-hidden="true">
      <strong>
      Analytics & Insights
      </strong>
      <span className="cap-subtitle">
      Data to actionable insight
      </span>
      <span className="cap-points" role="list">
      <span className="cap-point" role="listitem">
      Unify data sources
      </span>
      <span className="cap-point" role="listitem">
      Identify trends & root causes
      </span>
      <span className="cap-point" role="listitem">
      Compare portfolios & simulate scenarios
      </span>
      <span className="cap-point" role="listitem">
      Produce actionable insights
      </span>
      </span>
      </span>
      </span>
      </button>
      <button type="button" className="cap-flip " aria-pressed="false" aria-label="Configurable AI Platforms: Adapt solutions to evolving business requirements. Activate to preview">
      <span className="cap-flip-inner">
      <span className="cap-face cap-front" aria-hidden="false">
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-blocks">
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" />
      </svg>
      <strong>
      Configurable AI Platforms
      </strong>
      <span>
      Adapt solutions to evolving business requirements.
      </span>
      <small>
      Hover or tap to explore ↗
      </small>
      </span>
      <span className="cap-face cap-back" aria-hidden="true">
      <strong>
      Configurable AI Platforms
      </strong>
      <span className="cap-subtitle">
      Adapt the platform
      </span>
      <span className="cap-points" role="list">
      <span className="cap-point" role="listitem">
      Configure rules
      </span>
      <span className="cap-point" role="listitem">
      Map databases & APIs
      </span>
      <span className="cap-point" role="listitem">
      Manage templates & modules
      </span>
      <span className="cap-point" role="listitem">
      Track versions & approvals
      </span>
      </span>
      </span>
      </span>
      </button>
      <button type="button" className="cap-flip " aria-pressed="false" aria-label="Trusted Enterprise AI: Design for security, accountability, and traceability. Activate to preview">
      <span className="cap-flip-inner">
      <span className="cap-face cap-front" aria-hidden="false">
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
      </svg>
      <strong>
      Trusted Enterprise AI
      </strong>
      <span>
      Design for security, accountability, and traceability.
      </span>
      <small>
      Hover or tap to explore ↗
      </small>
      </span>
      <span className="cap-face cap-back" aria-hidden="true">
      <strong>
      Trusted Enterprise AI
      </strong>
      <span className="cap-subtitle">
      Governed enterprise intelligence
      </span>
      <span className="cap-points" role="list">
      <span className="cap-point" role="listitem">
      Enterprise SSO & RBAC
      </span>
      <span className="cap-point" role="listitem">
      Protect data
      </span>
      <span className="cap-point" role="listitem">
      Maintain audit records
      </span>
      <span className="cap-point" role="listitem">
      Human oversight & governance
      </span>
      </span>
      </span>
      </span>
      </button>
      </div>
      </div>
      </section>
      <section className="section container">
      <div className="section-head">
      <div>
      <div className="eyebrow">
      FEATURED PRODUCTS
      </div>
      <h2>
      Built to Work.
      <br />
      Designed to Evolve.
      </h2>
      </div>
      <Link className="text-link" href="/products/">
      View all products{" "}
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
      </svg>
      </Link>
      </div>
      <div className="product-grid">
      <Link className="product-card" href="/products/credit-strategy-simulator/">
      <div className="product-art">
      <img className="product-thumbnail" src="/products/credit-strategy-simulator.svg" alt="Credit Strategy Simulator — illustrative product workflow" width="800" height="480" loading="lazy" />
      </div>
      <div className="product-body">
      <span className="eyebrow">
      CREDIT POLICY INTELLIGENCE
      </span>
      <h3>
      Credit Strategy Simulator
      </h3>
      <p>
      Simulate credit policy changes before deployment. Explore potential effects on approvals, risk exposure, and portfolio outcomes.
      </p>
      <span className="learn">
      Explore product{" "}
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
      </svg>
      </span>
      </div>
      </Link>
      <Link className="product-card" href="/products/sme-credit-decisioning/">
      <div className="product-art">
      <img className="product-thumbnail" src="/products/sme-credit-decisioning.svg" alt="SME Credit Decisioning Workbench — illustrative product workflow" width="800" height="480" loading="lazy" />
      </div>
      <div className="product-body">
      <span className="eyebrow">
      EXPLAINABLE CREDIT INTELLIGENCE
      </span>
      <h3>
      SME Credit Decisioning Workbench
      </h3>
      <p>
      Bring financial analysis, policy evaluation, risk review, and credit recommendations into one workbench with evidence and human oversight.
      </p>
      <span className="learn">
      Explore product{" "}
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
      </svg>
      </span>
      </div>
      </Link>
      <Link className="product-card" href="/products/similar-portfolio-intelligence/">
      <div className="product-art">
      <img className="product-thumbnail" src="/products/similar-portfolio-intelligence.svg" alt="Similar Portfolio Intelligence — illustrative product workflow" width="800" height="480" loading="lazy" />
      </div>
      <div className="product-body">
      <span className="eyebrow">
      CONTEXTUAL PORTFOLIO INSIGHTS
      </span>
      <h3>
      Similar Portfolio Intelligence
      </h3>
      <p>
      Compare financing applications with relevant historical portfolio segments to understand patterns, risk indicators, and comparable outcomes.
      </p>
      <span className="learn">
      Explore product{" "}
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
      </svg>
      </span>
      </div>
      </Link>
      <Link className="product-card" href="/products/riva/">
      <div className="product-art">
      <img className="product-thumbnail" src="/products/riva.svg" alt="RIVA — illustrative product workflow" width="800" height="480" loading="lazy" />
      </div>
      <div className="product-body">
      <span className="eyebrow">
      REPORTING INTELLIGENCE, VALIDATION & ANALYTICS
      </span>
      <h3>
      RIVA
      </h3>
      <p>
      A configurable reporting environment connecting data sources, mapping report fields, supporting validation, and simplifying reporting workflows.
      </p>
      <span className="learn">
      Explore product{" "}
      <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
      </svg>
      </span>
      </div>
      </Link>
      </div>
      </section>
      <section className="section cinematic">
      <div className="container cinematic-inner">
      <div className="eyebrow">
      SEE INTELLIGENCE IN ACTION
      </div>
      <h2>
      Don&apos;t Just Imagine
      <br />
      What AI Can Do.{" "}
      <em>
      See It.
      </em>
      </h2>
      <p>
      Explore real product experiences, intelligent workflows, and ideas brought to life through engineering.
      </p>
      <Link className="btn" href="/media/">
      Watch Product Showcases{" "}
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play">
      <polygon points="6 3 20 12 6 21 6 3" />
      </svg>
      </Link>
      </div>
      </section>
      <section className="section container">
      <div className="section-head">
      <div>
      <div className="eyebrow">
      TRUST BY DESIGN
      </div>
      <h2>
      Innovation Without
      <br />
      Compromising Trust.
      </h2>
      </div>
      <p>
      Enterprise AI must be as accountable as it is intelligent.
      </p>
      </div>
      <div className="trust-grid">
      <div>
      <span>
      01
      </span>
      <strong>
      Identity & SSO
      </strong>
      </div>
      <div>
      <span>
      02
      </span>
      <strong>
      Role-Based Access
      </strong>
      </div>
      <div>
      <span>
      03
      </span>
      <strong>
      Auditability
      </strong>
      </div>
      <div>
      <span>
      04
      </span>
      <strong>
      Data Protection
      </strong>
      </div>
      <div>
      <span>
      05
      </span>
      <strong>
      Human Oversight
      </strong>
      </div>
      <div>
      <span>
      06
      </span>
      <strong>
      Secure Deployment
      </strong>
      </div>
      </div>
      </section>
      <section className="section section-muted">
      <div className="container">
      <div className="section-head">
      <div>
      <div className="eyebrow">
      WHAT&apos;S HAPPENING
      </div>
      <h2>
      Ideas in Motion.
      </h2>
      </div>
      </div>
      <div className="news-grid">
      <Link href="/lab/">
      <span>
      AI LAB
      </span>
      <h3>
      Experiment Boldly. Engineer Purposefully.
      </h3>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right">
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
      </svg>
      </Link>
      <Link href="/live">
      <span>
      azentio.ai LIVE
      </span>
      <h3>
      Conversations Where Intelligence Comes Alive.
      </h3>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-radio">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </svg>
      </Link>
      <Link href="/insights/">
      <span>
      PERSPECTIVES
      </span>
      <h3>
      Ideas Worth Exploring. Perspectives Worth Sharing.
      </h3>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
      </svg>
      </Link>
      </div>
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
      </div>
    </>
  );
}
