import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadForm } from "./lead-form";
import { submitLead } from "../lib/submit-lead";

vi.mock("../lib/submit-lead", () => ({ submitLead: vi.fn() }));
const submit = vi.mocked(submitLead);

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function fillForm() {
  fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Alex Smith" } });
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: "alex@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/^service/i), {
    target: { value: "Web Application Development" },
  });
  fireEvent.change(screen.getByLabelText(/tell us about/i), {
    target: { value: "We need a new website." },
  });
}

describe("LeadForm", () => {
  it("shows confirmation and clears the form after submission", async () => {
    submit.mockResolvedValueOnce({ success: true });
    render(<LeadForm />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /send your request/i }));
    expect(await screen.findByText(/your request has been received/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toHaveValue("");
    expect(submit).toHaveBeenCalledOnce();
  });

  it("reuses the request ID on a retry but changes it when the details change", async () => {
    submit.mockRejectedValue(new Error("Please try again."));
    render(<LeadForm />);
    fillForm();
    const button = screen.getByRole("button", { name: /send your request/i });
    fireEvent.click(button);
    await screen.findByText("Please try again.");
    fireEvent.click(button);
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    const first = submit.mock.calls[0]![0].data.requestId;
    expect(submit.mock.calls[1]![0].data.requestId).toBe(first);
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText(/tell us about/i), {
      target: { value: "We need a different website." },
    });
    fireEvent.click(button);
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(3));
    expect(submit.mock.calls[2]![0].data.requestId).not.toBe(first);
  });
});
