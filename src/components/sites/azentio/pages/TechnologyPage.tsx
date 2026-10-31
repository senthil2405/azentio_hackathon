import Link from "next/link";

export function TechnologyPage() {
  return (
    <>
      <section className="page-hero">
      <div className="container">
      <div className="eyebrow">
      TECHNOLOGY & TRUST
      </div>
      <h1>
      Built for Intelligence. Engineered for Trust.
      </h1>
      <p>
      Reliable data foundations, thoughtful orchestration, secure integration, controlled execution, and transparent governance.
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
      Enterprise Integration
      </h2>
      <p>
      Connect applications, data sources, business rules, and enterprise services through controlled interfaces.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      02
      </span>
      <h2>
      AI Orchestration
      </h2>
      <p>
      Combine models, workflows, agents, deterministic logic, and human approvals.
      </p>
      </article>
      <article className="info-card" id="trust-security">
      <span className="eyebrow">
      03
      </span>
      <h2>
      Security by Design
      </h2>
      <p>
      Support institution SSO, role-based access, encrypted transport, audit trails, and secure deployment.
      </p>
      </article>
      <article className="info-card">
      <span className="eyebrow">
      04
      </span>
      <h2>
      Responsible AI
      </h2>
      <p>
      Support explainability, model oversight, traceability, and human control. Security testing claims require verified evidence.
      </p>
      </article>
      </div>
      </section>
      <section className="section section-muted">
      <div className="container">
      <div className="eyebrow">
      REFERENCE ARCHITECTURE
      </div>
      <h2>
      Intelligence with Governance at Every Layer.
      </h2>
      <div className="architecture">
      <div>
      USER EXPERIENCE{" "}
      <small>
      Workbenches · Copilots · APIs
      </small>
      </div>
      <span>
      ↓
      </span>
      <div>
      AI ORCHESTRATION & BUSINESS LOGIC{" "}
      <small>
      Workflows · Agents · Rules · Approvals
      </small>
      </div>
      <span>
      ↓
      </span>
      <div>
      MODEL INTELLIGENCE · ENTERPRISE DATA · SYSTEM INTEGRATION
      </div>
      <span>
      ↓
      </span>
      <div className="green-outline">
      TRUST, SECURITY & GOVERNANCE{" "}
      <small>
      SSO · RBAC · Encryption · Audit · Monitoring
      </small>
      </div>
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
    </>
  );
}
