"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppleIcon, GitHubIcon, GoogleIcon } from "./oauth-icons";

type Mode = "sign-in" | "sign-up";
type OAuthProvider = "github" | "google" | "apple";

const OAUTH_PROVIDERS: { id: OAuthProvider; label: string; icon: React.ReactNode }[] = [
  { id: "github", label: "Continue with GitHub", icon: <GitHubIcon /> },
  { id: "google", label: "Continue with Google", icon: <GoogleIcon /> },
  { id: "apple", label: "Continue with Apple", icon: <AppleIcon /> },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 16,
  border: "1px solid var(--line)",
  borderRadius: "var(--r-sm)",
  font: "inherit",
};

/**
 * Customer sign-in/sign-up (Phase 4 Part B1) — separate from /admin/login,
 * which only ever authenticates against the `admins` allowlist. Email +
 * password is the primary method; GitHub/Google/Apple are OAuth
 * alternatives via Supabase Auth's built-in providers (each must be
 * enabled with real client credentials in the Supabase dashboard before
 * the buttons work — see .env.example).
 */
export default function CustomerLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://")
      ? rawNext
      : "/account/topics";
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { data, error: authError } =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === "sign-up" && !data.session) {
      setNotice("Check your email for a confirmation link.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) setError(oauthError.message);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow)",
          padding: 32,
        }}
      >
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--ink)" }}>
            <div style={{ width: 26, height: 26, background: "var(--violet)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="display" style={{ fontWeight: 700, fontSize: 16 }}>Sourced</span>
          </Link>
          <Link href="/" style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}>
            ← Home
          </Link>
        </div>

        <h1 className="display" style={{ fontSize: 20, margin: "0 0 24px" }}>
          {mode === "sign-in" ? "Sign in" : "Create your account"}
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {OAUTH_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleOAuth(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "10px 12px",
                background: "var(--bg)",
                color: "inherit",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "0 0 20px",
            color: "var(--ink-soft)",
            fontSize: 12,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {error && (
            <p style={{ color: "var(--coral)", fontSize: 13, marginBottom: 16 }}>{error}</p>
          )}
          {notice && (
            <p style={{ color: "var(--violet)", fontSize: 13, marginBottom: 16 }}>{notice}</p>
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
            {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setError(null);
            setNotice(null);
          }}
          style={{
            width: "100%",
            marginTop: 16,
            background: "none",
            border: "none",
            color: "var(--ink-soft)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
