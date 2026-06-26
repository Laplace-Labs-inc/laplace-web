import { useState } from "react";

// FABLE-032: waitlist persistence.
// REAL connection when PUBLIC_WAITLIST_ENDPOINT is configured at build time;
// HONEST explicit gate (disabled, no fake success) when it is not.
//
// Env contract (see astro/.env.example):
//   PUBLIC_WAITLIST_ENDPOINT — HTTPS URL that accepts an HTTP POST with a JSON
//   body { "email": "<address>" } and returns a 2xx status on success
//   (e.g. a Formspree/Buttondown form endpoint or the laplace-api waitlist route).
//   The URL is public by design (PUBLIC_ prefix → inlined into client JS); it
//   must NOT be a secret-bearing credential.
const ENDPOINT = import.meta.env.PUBLIC_WAITLIST_ENDPOINT as string | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "loading" | "success" | "error";

export const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  // Honest explicit launch-gate: no persistence target wired, so we do not
  // pretend to accept submissions. The control is visibly disabled.
  if (!ENDPOINT) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 text-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-center">
          <input
            type="email"
            placeholder="Waitlist opens before M1 launch"
            disabled
            aria-disabled="true"
            className="flex-1 cursor-not-allowed rounded-full border border-brand-border bg-brand-surface px-5 py-3 text-fg opacity-60 placeholder:text-brand-muted"
          />
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="cursor-not-allowed whitespace-nowrap rounded-full bg-brand-accent px-7 py-3 font-bold text-brand-bg opacity-50"
          >
            Notify Me -&gt;
          </button>
        </div>
        <p className="text-sm text-brand-muted">
          Sign-up is not open yet. Reach us at{" "}
          <a href="mailto:hello@laplace-labs.com" className="text-brand-accent hover:underline">
            hello@laplace-labs.com
          </a>{" "}
          in the meantime.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again or email hello@laplace-labs.com.");
    }
  };

  const loading = status === "loading";

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status === "error") setStatus("idle");
        }}
        placeholder="you@company.com"
        required
        disabled={loading}
        className="flex-1 rounded-full border border-brand-border bg-brand-surface px-5 py-3 text-fg placeholder:text-brand-muted transition-colors focus:border-brand-accent focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={loading}
        className="whitespace-nowrap rounded-full bg-brand-accent px-7 py-3 font-bold text-brand-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Notify Me ->"}
      </button>
      {status === "success" && (
        <p className="mt-2 w-full text-center text-sm text-green-400">
          ✓ You&apos;re on the list. We&apos;ll reach out before M1 launch.
        </p>
      )}
      {status === "error" && <p className="mt-2 w-full text-center text-sm text-red-400">{message}</p>}
    </form>
  );
};
