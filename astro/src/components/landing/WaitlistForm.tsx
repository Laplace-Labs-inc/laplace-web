import { useState } from "react";

export const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO M1: 실제 waitlist API 연동 (현재는 로컬 상태만)
    // 현재는 UI 완성도 확인용 stub
    if (email && email.includes("@")) {
      setStatus("success");
    } else {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        className="flex-1 rounded-full border border-brand-border bg-brand-surface px-5 py-3 text-white placeholder:text-brand-muted transition-colors focus:border-brand-accent focus:outline-none"
      />
      <button
        type="submit"
        className="whitespace-nowrap rounded-full bg-brand-accent px-7 py-3 font-bold text-brand-bg transition-opacity hover:opacity-90"
      >
        Notify Me -&gt;
      </button>
      {status === "success" && (
        <p className="mt-2 w-full text-center text-sm text-green-400">✓ You&apos;re on the list. We&apos;ll reach out before M1 launch.</p>
      )}
      {status === "error" && <p className="mt-2 w-full text-center text-sm text-red-400">Please enter a valid email address.</p>}
    </form>
  );
};
