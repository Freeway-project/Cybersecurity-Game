"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AdminLoginForm() {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to sign in.");
      }

      window.location.reload();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <div className="space-y-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            Admin Access
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
            Enter the pilot admin secret
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            This unlocks invite generation and the raw and analysis exports.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--ink)]">Admin secret</span>
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none ring-0 transition placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-strong)]"
              placeholder="Enter ADMIN_SECRET"
            />
          </label>
          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={loading || !secret.trim()}>
            {loading ? "Signing in..." : "Unlock admin console"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
