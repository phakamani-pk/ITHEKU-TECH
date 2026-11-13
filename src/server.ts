import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { handleApi } from "./server/handler";

const start = createStartHandler(defaultStreamHandler);
const fetch: RequestHandler<Register> = (request, options) => {
  const path = new URL(request.url).pathname;
  if (path === "/api" || path.startsWith("/api/")) return handleApi(request);
  return start(request, options);
};

export default { fetch };
