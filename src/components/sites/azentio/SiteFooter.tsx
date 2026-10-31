import Link from "next/link";

export function SiteFooter() {
  return (
    <>
      <footer className="footer">
      <div className="container">
      <div className="footer-grid">
      <div>
      <Link className="logo" aria-label="azentio.ai" href="/">
      <span>
      a
      </span>
      zent
      <span>
      i
      </span>
      o
      <span>
      .ai
      </span>
      </Link>
      <p>
      Build Intelligence. Create Impact.
      </p>
      </div>
      <div>
      <h4>
      Explore
      </h4>
      <Link href="/products/">
      Products
      </Link>
      <Link href="/solutions/">
      Solutions
      </Link>
      <Link href="/lab/">
      AI Lab
      </Link>
      <Link href="/technology/">
      Technology
      </Link>
      </div>
      <div>
      <h4>
      Discover
      </h4>
      <Link href="/media/">
      Media
      </Link>
      <Link href="/live">
      Live
      </Link>
      <Link href="/insights/">
      Insights
      </Link>
      <Link href="/about/">
      About
      </Link>
      </div>
      <div>
      <h4>
      Connect
      </h4>
      <Link href="/connect/">
      Request Demo
      </Link>
      <Link href="/connect/">
      Collaborate
      </Link>
      <Link href="/connect/">
      Contact
      </Link>
      <Link href="/configurator">
      Admin
      </Link>
      <Link href="/playground">
      Playground
      </Link>
      </div>
      </div>
      <div className="footer-bottom">
      © 2026 azentio.ai · Product information is indicative and subject to validation.{" "}
      <span>
      Privacy · Terms · Accessibility
      </span>
      </div>
      </div>
      </footer>
    </>
  );
}
