import { ArrowDownRight, ArrowRight, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import logoMark from "../assets/itheku-mark.png";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <a className="wordmark" href="/" aria-label="iTheku Tech home">
            <img className="wordmark-icon" src={logoMark} alt="" width={48} height={42} />
            <span>
              itheku<span>tech</span>
              <small>BUILD WHAT&apos;S NEXT</small>
            </span>
          </a>
          <nav className="site-nav" aria-label="Main navigation">
            <a href="/#approach">Our approach</a>
            <a href="/services">Services</a>
            <details className="nav-menu">
              <summary>
                Enterprise <ChevronDown size={14} />
              </summary>
              <div className="nav-dropdown">
                <span>YOUR WORKSPACE</span>
                <a href="/client-portal">
                  <strong>Client portal</strong>
                  <small>Track your project</small>
                </a>
                <a href="/admin-portal">
                  <strong>Admin portal</strong>
                  <small>Manage delivery</small>
                </a>
                <a href="/services">
                  <strong>Our services</strong>
                  <small>Explore our capabilities</small>
                </a>
              </div>
            </details>
          </nav>
          <a className="header-button" href="/#contact">
            Let&apos;s talk <ArrowUpRightIcon />
          </a>
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <div className="shell footer-top">
          <div>
            <p className="kicker">LET&apos;S MAKE SOMETHING BETTER</p>
            <h2>
              Have an idea?
              <br />
              <em>Let&apos;s build it.</em>
            </h2>
          </div>
          <a className="round-arrow" href="/#contact" aria-label="Start a project">
            <ArrowDownRight size={35} />
          </a>
        </div>
        <div className="shell footer-bottom">
          <a className="wordmark footer-brand" href="/">
            <img className="wordmark-icon" src={logoMark} alt="" width={48} height={42} />
            <span>
              itheku<span>tech</span>
              <small>BUILD WHAT&apos;S NEXT</small>
            </span>
          </a>
          <p>Thoughtful technology. Real business impact.</p>
          <div>
            <a href="/services">Services</a>
            <a href="/client-portal">Client portal</a>
            <a href="/admin-portal">Admin portal</a>
          </div>
        </div>
      </footer>
    </>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight size={16} aria-hidden="true" />;
}
