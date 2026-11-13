import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import { SiteLayout } from "../components/site-layout";
import { services } from "../data/services";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const service = services.find((item) => item.slug === params.slug);
    if (!service) throw notFound();
    return service;
  },
  component: ServiceDetail,
});

function ServiceDetail() {
  const service = Route.useLoaderData();
  return (
    <SiteLayout>
      <main>
        <section className="page-hero detail-hero">
          <div className="shell">
            <a className="back-link" href="/services">
              <ArrowLeft size={16} /> All services
            </a>
            <p className="kicker">OUR CAPABILITIES</p>
            <h1>
              {service.title}
              <span>.</span>
            </h1>
            <p>{service.description}</p>
            <a className="button button-lime" href="/#contact">
              Discuss your project <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
        <section className="section">
          <div className="shell detail-layout">
            <div>
              <p className="kicker">WHAT WE CAN HELP WITH</p>
              <h2>
                Built for your
                <br />
                <em>business needs.</em>
              </h2>
              <p className="detail-copy">
                {service.short} Every engagement starts with understanding your goals and finding
                the right solution together.
              </p>
            </div>
            <ul className="capability-list">
              {service.items.map((item) => (
                <li key={item}>
                  <span>
                    <Check size={16} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
