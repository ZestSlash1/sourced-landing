"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up";
type OAuthProvider = "github" | "google" | "apple";

const OAUTH_PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: "github", label: "Continue with GitHub" },
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" },
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
  const router = useRouter();
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

    // signUp only returns a session immediately when email autoconfirm is
    // on (no confirmation email needed); otherwise data.session is null and
    // the account genuinely needs the email step before it can sign in.
    if (mode === "sign-up" && !data.session) {
      setNotice("Check your email to confirm your account, then sign in.");
      setMode("sign-in");
      return;
    }

    router.push("/account/topics");
    router.refresh();
  }

  async function handleOAuth(provider: OAuthProvider) {
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
                padding: "10px 12px",
                background: "var(--bg)",
                color: "inherit",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
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
            {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Sign up"}
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
