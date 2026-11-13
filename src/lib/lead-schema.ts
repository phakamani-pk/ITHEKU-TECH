import { z } from "zod";

export const leadSchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(254),
  company: z.string().trim().max(100),
  service: z.string().trim().min(1, "Please select a service.").max(100),
  message: z.string().trim().min(10, "Please tell us a little more about your project.").max(5000),
});

export type Lead = z.infer<typeof leadSchema>;
