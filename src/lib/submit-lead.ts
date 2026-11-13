import { createServerFn } from "@tanstack/react-start";
import { leadSchema } from "./lead-schema";

export const submitLead = createServerFn({ method: "POST" })
  .validator(leadSchema)
  .handler(async ({ data }) => {
    const { handleApi } = await import("../server/handler");
    const response = await handleApi(
      new Request("http://internal/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      }),
    );
    const result: { success?: boolean; error?: string } = await response.json();
    if (!response.ok || !result.success)
      throw new Error(result.error ?? "We couldn't send your request. Please try again.");
    return { success: true };
  });
