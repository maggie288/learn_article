"use client";

import { useState } from "react";

interface WaitlistFormProps {
  onSuccess?: () => void;
}

export function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setMessage("");

    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const json = (await res.json()) as { success?: boolean; error?: { message: string } };

    if (res.ok && json.success !== false) {
      setStatus("success");
      setEmail("");
      onSuccess?.();
      setMessage("Thanks! We’ll be in touch.");
    } else {
      setStatus("error");
      setMessage(json.error?.message ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 sm:flex-nowrap">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={status === "sending"}
        className="min-w-0 flex-1 rounded-full border border-slate-600 bg-slate-800/80 px-4 py-3 text-slate-200 placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-60"
        required
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="shrink-0 rounded-full bg-sky-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Notify me"}
      </button>
      {message ? (
        <p
          className={`w-full text-sm sm:w-auto ${
            status === "success" ? "text-emerald-400" : "text-rose-300"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
