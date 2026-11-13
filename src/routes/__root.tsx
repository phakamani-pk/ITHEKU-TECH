import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import stylesheet from "../styles.css?url";
import logoMark from "../assets/itheku-mark.png";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "iTheku Tech | Digital solutions for your business" },
      {
        name: "description",
        content:
          "Build your next digital solution with iTheku Tech. Explore our services and request a quote.",
      },
    ],
    links: [
      { rel: "stylesheet", href: stylesheet },
      { rel: "icon", type: "image/png", href: logoMark },
    ],
  }),
  component: Root,
});

function Root() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
