import { useRef, useState, type FormEvent } from "react";
import { services } from "../data/services";
import { leadSchema } from "../lib/lead-schema";
import { submitLead } from "../lib/submit-lead";

export function LeadForm() {
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);
  const requestId = useRef<string | null>(null);
  const previousValues = useRef<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const currentValues = JSON.stringify([
      values.get("name"),
      values.get("email"),
      values.get("company"),
      values.get("service"),
      values.get("message"),
    ]);
    if (previousValues.current !== currentValues) {
      requestId.current = crypto.randomUUID();
      previousValues.current = currentValues;
    }
    const parsed = leadSchema.safeParse({
      requestId: requestId.current,
      name: values.get("name"),
      email: values.get("email"),
      company: values.get("company"),
      service: values.get("service"),
      message: values.get("message"),
    });
    if (!parsed.success) {
      setNotice(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    setPending(true);
    setNotice("");
    try {
      await submitLead({ data: parsed.data });
      form.reset();
      requestId.current = null;
      previousValues.current = null;
      setSuccess(true);
      setNotice("Thank you. Your request has been received.");
    } catch (error) {
      setSuccess(false);
      setNotice(
        error instanceof Error ? error.message : "We couldn't send your request. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          Your name <span aria-hidden="true">*</span>
          <input name="name" autoComplete="name" required minLength={2} maxLength={100} />
        </label>
        <label>
          Email address <span aria-hidden="true">*</span>
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Company <small>(optional)</small>
          <input name="company" autoComplete="organization" maxLength={100} />
        </label>
        <label>
          Service <span aria-hidden="true">*</span>
          <select name="service" defaultValue="" required>
            <option value="" disabled>
              Select a service
            </option>
            {services.map((service) => (
              <option key={service.title}>{service.title}</option>
            ))}
            <option>Other / not sure yet</option>
          </select>
        </label>
      </div>
      <label>
        Tell us about your project <span aria-hidden="true">*</span>
        <textarea
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={5000}
          placeholder="What are you looking to build or improve?"
        />
      </label>
      <button className="button button-dark" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send your request"}
      </button>
      <p className="form-note">Your details will be used to respond to your enquiry.</p>
      {notice && (
        <p className={success ? "notice success" : "notice error"} role="status">
          {notice}
        </p>
      )}
    </form>
  );
}
