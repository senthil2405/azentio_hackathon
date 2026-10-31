import Link from "next/link";

export function SiteHeaderMarkup() {
  return (
    <>
      <header className="header site-header">
      <div className="container header-inner site-header-inner">
      <Link className="logo" href="/" aria-label="azentio.ai home">
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
      <nav id="primary-navigation" className="primary-navigation" aria-label="Main navigation">
      <ul className="primary-links">
      <li>
      <Link className="primary-link" href="/products">
      Products
      </Link>
      </li>
      <li id="nav-group-innovation" className="navigation-group">
      <button className="primary-link nav-disclosure" type="button" aria-expanded="false" aria-controls="mega-innovation">
      Innovation
      </button>
      <div className="mega-panel" id="mega-innovation" hidden>
      <ul className="mega-links">
      <li>
      <Link href="/lab">
      <img className="nav-thumbnail" src="/banners/hackathon.svg" alt="" width="42" height="32" />
      <span className="mega-label">
      AI Lab
      </span>
      </Link>
      </li>
      <li>
      <Link href="/technology">
      <img className="nav-thumbnail" src="/banners/intelligence.svg" alt="" width="42" height="32" />
      <span className="mega-label">
      Technology
      </span>
      </Link>
      </li>
      <li>
      <Link href="/hackathon/register">
      <img className="nav-thumbnail" src="/banners/hackathon.svg" alt="" width="42" height="32" />
      <span className="mega-label">
      Hackathons
      </span>
      </Link>
      </li>
      </ul>
      </div>
      </li>
      <li id="nav-group-explore" className="navigation-group">
      <button className="primary-link nav-disclosure" type="button" aria-expanded="false" aria-controls="mega-explore">
      Explore
      </button>
      <div className="mega-panel" id="mega-explore" hidden>
      <ul className="mega-links">
      <li>
      <Link href="/solutions">
      <img className="nav-thumbnail" src="/products/similar-portfolio-intelligence.svg" alt="" width="42" height="32" />
      <span className="mega-label">
      Solutions
      </span>
      </Link>
      </li>
      <li>
      <Link href="/media">
      <img className="nav-thumbnail" src="/navigation/media.svg" alt="" width="42" height="32" />
      <span className="mega-label">
      Media & Videos
      </span>
      </Link>
      </li>
      <li>
      <Link href="/insights">
      <img className="nav-thumbnail" src="/products/persona-newsroom.svg" alt="" width="42" height="32" />
      <span className="mega-label">
      Insights
      </span>
      </Link>
      </li>
      </ul>
      </div>
      </li>
      <li>
      <Link className="primary-link" href="/about">
      About
      </Link>
      </li>
      <li id="nav-group-admin" className="navigation-group">
      <Link className="primary-link" href="/configurator">
      Admin
      </Link>
      <button aria-label="Open Admin submenu" className="admin-menu-toggle nav-disclosure" type="button" aria-expanded="false" aria-controls="mega-admin">
      <span aria-hidden="true">
      ⋮
      </span>
      </button>
      <div className="mega-panel" id="mega-admin" hidden>
      <ul className="mega-links">
      <li>
      <Link href="/configurator">
      <span className="mega-label">
      Configurator
      </span>
      </Link>
      </li>
      <li>
      <Link href="/playground">
      <span className="mega-label">
      Playground
      </span>
      </Link>
      </li>
      <li>
      <Link href="/live">
      <span className="mega-label">
      Live Streaming
      </span>
      </Link>
      </li>
      </ul>
      </div>
      </li>
      </ul>
      <div className="mobile-nav-extras">
      <Link className="btn" href="/connect">
      Request Demo
      </Link>
      </div>
      </nav>
      <Link className="btn header-demo" href="/connect">
      Request Demo
      </Link>
      <button className="navigation-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="primary-navigation">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu" aria-hidden="true">
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
      </button>
      </div>
      </header>
    </>
  );
}
