import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Braces,
  Cpu,
  Layers3,
  MoveUpRight,
  Sparkles,
} from "lucide-react";
import { LeadForm } from "../components/lead-form";
import { SiteLayout } from "../components/site-layout";
import { services } from "../data/services";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const icons = [Braces, Layers3, Boxes, Sparkles, Cpu];
  return (
    <SiteLayout>
      <main>
        <section className="home-hero">
          <div className="shell hero-content">
            <div className="hero-text">
              <div className="availability">
                <span /> YOUR DIGITAL PARTNER FOR WHAT&apos;S NEXT
              </div>
              <h1>
                Big ideas.
                <br />
                <span>Better</span> digital<span className="hero-dot">.</span>
              </h1>
              <p>
                From the first spark to the final pixel, we turn ambitious ideas into intelligent
                software that moves your business forward.
              </p>
              <div className="hero-actions">
                <a className="button button-lime" href="#contact">
                  Let&apos;s build together <ArrowUpRight size={17} />
                </a>
                <a className="hero-secondary" href="/services">
                  Explore what we do <ArrowRight size={17} />
                </a>
              </div>
              <div className="hero-bottom-line">
                <span>STRATEGY</span>
                <i /> <span>DESIGN</span>
                <i /> <span>ENGINEERING</span>
                <i /> <span>AI</span>
              </div>
            </div>
            <div className="hero-visual" aria-label="Illustration of a digital project workspace">
              <div className="visual-orbit orbit-a" />
              <div className="visual-orbit orbit-b" />
              <div className="workspace-mock">
                <div className="mock-top">
                  <span className="mock-logo">
                    <span>✳</span> workspace
                  </span>
                  <span className="mock-dots">•••</span>
                </div>
                <div className="mock-body">
                  <div className="mock-side">
                    <span className="mock-side-active">◫</span>
                    <span>▤</span>
                    <span>◷</span>
                    <span>⚙</span>
                  </div>
                  <div className="mock-main">
                    <div className="mock-heading">
                      <div>
                        <small>YOUR WORKSPACE</small>
                        <strong>
                          Good morning, Alex <span>✳</span>
                        </strong>
                      </div>
                      <div className="mock-avatar">A</div>
                    </div>
                    <div className="mock-cards">
                      <div className="mock-card">
                        <small>PROJECT STATUS</small>
                        <b>
                          <i /> On track
                        </b>
                        <div className="mock-bar">
                          <span />
                        </div>
                        <em>Built for clarity</em>
                      </div>
                      <div className="mock-card mock-chart">
                        <small>PROGRESS OVERVIEW</small>
                        <div className="chart-bars">
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                    </div>
                    <div className="mock-activity">
                      <small>RECENT ACTIVITY</small>
                      <div>
                        <span className="activity-icon">✓</span>
                        <p>
                          <strong>Design review</strong>
                          <small>A better way to collaborate</small>
                        </p>
                        <em>Complete</em>
                      </div>
                      <div>
                        <span className="activity-icon lavender">↗</span>
                        <p>
                          <strong>Product development</strong>
                          <small>Ideas moving forward</small>
                        </p>
                        <em>In progress</em>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="float-note">
                <span>✳</span>
                <div>
                  <strong>Built around you</strong>
                  <small>Thoughtful by design</small>
                </div>
              </div>
              <div className="visual-label">A CONCEPTUAL WORKSPACE EXPERIENCE</div>
            </div>
          </div>
          <div className="shell hero-scroll">
            <span>DESIGNED TO MAKE A DIFFERENCE</span>
            <a href="#services">
              SCROLL TO EXPLORE <ArrowDown size={14} />
            </a>
          </div>
        </section>
        <section className="capability-strip">
          <div className="shell">
            <span>IDEAS MADE REAL</span>
            <strong>
              Strategy <i>✳</i> Design <i>✳</i> Technology <i>✳</i> Intelligence
            </strong>
            <span>BUILT WITH PURPOSE ↗</span>
          </div>
        </section>
        <section className="section services-preview" id="services">
          <div className="shell">
            <div className="section-intro">
              <div>
                <p className="kicker">01 / WHAT WE DO</p>
                <h2>
                  Everything you need
                  <br />
                  <em>to move forward.</em>
                </h2>
              </div>
              <div>
                <p>
                  Big challenges call for thoughtful solutions. We bring strategy, creativity and
                  engineering together to build technology that works harder for you.
                </p>
                <a className="inline-link" href="/services">
                  Explore all 13 services <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
            <div className="service-preview-grid">
              {services.slice(0, 5).map((service, index) => {
                const Icon = icons[index]!;
                return (
                  <a className="preview-card" key={service.slug} href={`/services/${service.slug}`}>
                    <div className="preview-card-top">
                      <span className="preview-icon">
                        <Icon size={22} />
                      </span>
                      <span>0{index + 1} / 13</span>
                    </div>
                    <div>
                      <h3>{service.title}</h3>
                      <p>{service.short}</p>
                    </div>
                    <span className="card-arrow">
                      <ArrowUpRight size={18} />
                    </span>
                  </a>
                );
              })}
              <a className="preview-card all-card" href="/services">
                <span>THE FULL PICTURE</span>
                <h3>
                  One partner.
                  <br />
                  Many possibilities.
                </h3>
                <span className="all-link">
                  View all services <MoveUpRight size={20} />
                </span>
              </a>
            </div>
          </div>
        </section>
        <section className="section process-section" id="approach">
          <div className="shell">
            <div className="section-intro">
              <div>
                <p className="kicker">02 / OUR APPROACH</p>
                <h2>
                  Built with purpose.
                  <br />
                  <em>Made for people.</em>
                </h2>
              </div>
              <p>
                Great software isn&apos;t just about code. It starts with understanding your
                business, your people and the problem you&apos;re here to solve.
              </p>
            </div>
            <div className="process-grid">
              {[
                {
                  n: "01",
                  title: "Discover",
                  text: "We listen, ask the right questions and turn your goals into a clear direction.",
                },
                {
                  n: "02",
                  title: "Design",
                  text: "We shape intuitive experiences and practical solutions around real needs.",
                },
                {
                  n: "03",
                  title: "Build",
                  text: "We develop, test and refine your solution with quality in mind.",
                },
                {
                  n: "04",
                  title: "Grow",
                  text: "We support and improve your product as your business evolves.",
                },
              ].map((step) => (
                <article key={step.n}>
                  <span>
                    {step.n} <ArrowUpRight size={16} />
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="section contact-section" id="contact">
          <div className="shell contact-layout">
            <div>
              <p className="kicker">03 / START A CONVERSATION</p>
              <h2>
                Let&apos;s make
                <br />
                <em>it happen.</em>
              </h2>
              <p>
                Have a challenge, an idea or a question? Tell us a little about it and let&apos;s
                explore what we can build together.
              </p>
              <div className="contact-promise">
                <span>✳</span>
                <div>
                  <strong>A good place to start</strong>
                  <small>No perfect brief required. Just tell us what&apos;s on your mind.</small>
                </div>
              </div>
            </div>
            <div className="form-panel">
              <div className="form-panel-heading">
                <span>PROJECT ENQUIRY</span>
                <ArrowUpRight size={19} />
              </div>
              <h3>Tell us about your project.</h3>
              <LeadForm />
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
