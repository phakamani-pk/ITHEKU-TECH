import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteLayout } from "../components/site-layout";
import { services } from "../data/services";

export const Route = createFileRoute("/services/")({ component: Services });

function Services() {
  return (
    <SiteLayout>
      <main>
        <section className="page-hero">
          <div className="shell">
            <p className="kicker">OUR CAPABILITIES / 01—13</p>
            <h1>
              Good ideas need
              <br />
              <em>great execution.</em>
            </h1>
            <p>
              From product strategy to intelligent automation, discover the capabilities we bring
              together to help your business move forward.
            </p>
            <a className="button button-lime" href="/#contact">
              Discuss your project <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
        <section className="section catalog">
          <div className="shell">
            <div className="catalog-heading">
              <p className="kicker">EXPLORE OUR SERVICES</p>
              <span>13 CAPABILITIES / ONE CONNECTED APPROACH</span>
            </div>
            <div className="catalog-grid">
              {services.map((service, index) => (
                <a href={`/services/${service.slug}`} className="catalog-card" key={service.slug}>
                  <span className="catalog-number">{String(index + 1).padStart(2, "0")} / 13</span>
                  <ArrowUpRight className="catalog-arrow" size={20} />
                  <h2>{service.title}</h2>
                  <p>{service.short}</p>
                  <span className="catalog-more">
                    Explore capability <ArrowUpRight size={15} />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
