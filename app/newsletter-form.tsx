"use client";

import { FormEvent, useState } from "react";

export default function NewsletterForm({ sourcePath }: { sourcePath: "/" | "/feed" | "/methodology" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sourcePath }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "We couldn't save your email. Please try again.");
      setStatus("success");
      setMessage("You’re on the list. The next proof drop will land in your inbox.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We couldn't save your email. Please try again.");
    }
  }

  return (
    <form className="newsletter-form" onSubmit={submit} noValidate>
      <label className="newsletter-label" htmlFor={`newsletter-email-${sourcePath.replace("/", "home")}`}>
        Get the weekly proof drop
      </label>
      <div className="newsletter-controls">
        <input
          id={`newsletter-email-${sourcePath.replace("/", "home")}`}
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={status === "submitting" || status === "success"}
          aria-describedby={`newsletter-message-${sourcePath.replace("/", "home")}`}
        />
        <button type="submit" disabled={status === "submitting" || status === "success"}>
          {status === "submitting" ? "Joining…" : status === "success" ? "You’re in" : "Get the drop"}
        </button>
      </div>
      <p className="newsletter-note">One evidence-backed idea each week. No spam, no sending automation yet.</p>
      <p id={`newsletter-message-${sourcePath.replace("/", "home")}`} className={`newsletter-message ${status}`} aria-live="polite">
        {message}
      </p>
    </form>
  );
}
