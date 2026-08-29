"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Single-admin login. No admin routes exist yet to redirect into on success
 * (see sourced-phase3-db-auth-spec.md Track B) — this just proves sign-in
 * works against the `admins` allowlist via requireAdmin() once something
 * calls it.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(900px 420px at 15% 0%, rgba(91,79,247,0.16), transparent 60%), radial-gradient(700px 360px at 100% 100%, rgba(255,111,94,0.12), transparent 55%), var(--bg)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-hover)",
          padding: 32,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--r-sm)",
            background: "var(--ink)",
            marginBottom: 18,
          }}
        />
        <h1 className="display" style={{ fontSize: 22, margin: "0 0 4px", letterSpacing: "-0.01em" }}>
          Admin sign in
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 24px" }}>Sourced operations</p>

        <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
          Email
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 16,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            font: "inherit",
          }}
        />

        <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 20,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            font: "inherit",
          }}
        />

        {error && (
          <p style={{ color: "var(--coral)", fontSize: 13, marginBottom: 16 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "var(--violet)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--r-sm)",
            fontWeight: 600,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
