"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Single-admin operations portal.
 * Authenticates against the `admins` allowlist via requireAdmin() once redirected to /admin.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCurrentEmail(user.email);
      }
    });
  }, []);

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

    window.location.href = "/admin";
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setCurrentEmail(null);
  }

  return (
    <main
      className="admin-login-wrap"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(1000px 500px at 50% 0%, rgba(124, 58, 237, 0.16), transparent 70%), radial-gradient(800px 400px at 90% 90%, rgba(56, 189, 248, 0.08), transparent 60%), #08090E",
        padding: "24px",
        position: "relative",
      }}
    >
      {/* Background ambient grid overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      <motion.form
        onSubmit={handleSubmit}
        className="admin-login-card"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 400,
          background: "#10121A",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "var(--r-xl, 20px)",
          boxShadow:
            "0 24px 64px rgba(0, 0, 0, 0.65), 0 0 35px rgba(124, 58, 237, 0.1)",
          padding: "36px 32px 32px",
          overflow: "hidden",
          zIndex: 1,
        }}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={
          error
            ? { opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -6, 6, 0] }
            : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{ type: "spring", stiffness: 250, damping: 25 }}
      >
        {/* Top accent beam */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background:
              "linear-gradient(90deg, transparent 0%, #7C3AED 35%, #38BDF8 65%, transparent 100%)",
            opacity: 0.9,
          }}
        />

        {/* Brand Emblem */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(56, 189, 248, 0.15) 100%)",
              border: "1px solid rgba(124, 58, 237, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(124, 58, 237, 0.25)",
              flexShrink: 0,
            }}
          >
            {/* High-tech Sourced Radar Signal Emblem */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#A78BFA" }}>
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" opacity="0.3" />
              <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6z" opacity="0.6" />
              <circle cx="12" cy="12" r="2" fill="#38BDF8" stroke="#38BDF8" />
              <line x1="12" y1="12" x2="19" y2="5" stroke="#7C3AED" strokeWidth="2.5" />
            </svg>
          </div>

          <div>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#A78BFA",
              }}
            >
              Sourced // Ops Console
            </div>
            <h1
              className="display"
              style={{
                fontSize: 21,
                fontWeight: 700,
                margin: 0,
                color: "var(--ink, #F4F4F6)",
                letterSpacing: "-0.015em",
              }}
            >
              Operations Gateway
            </h1>
          </div>
        </div>

        <p
          style={{
            fontSize: 12.5,
            color: "var(--ink-soft, #9496A6)",
            margin: "0 0 20px",
            lineHeight: 1.5,
          }}
        >
          Single-admin telemetry access. All sessions are cryptographically verified against the active security allowlist.
        </p>

        {/* Active Session Callout */}
        {currentEmail && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "12px 14px",
              background: "rgba(124, 58, 237, 0.08)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
              borderRadius: "var(--r-md, 12px)",
              fontSize: 12.5,
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#10B981",
                    boxShadow: "0 0 8px #10B981",
                    flexShrink: 0,
                  }}
                />
                <span
                  className="mono"
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink, #F4F4F6)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={currentEmail}
                >
                  {currentEmail}
                </span>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#10B981",
                  background: "rgba(16, 185, 129, 0.12)",
                  padding: "1px 6px",
                  borderRadius: "var(--r-chip, 100px)",
                }}
              >
                Active
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/admin";
                }}
                className="admin-btn admin-btn-primary"
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  borderRadius: "var(--r-sm, 8px)",
                  background: "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
                  boxShadow: "0 2px 10px rgba(124, 58, 237, 0.35)",
                }}
              >
                Open Dashboard →
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="admin-btn admin-btn-ghost"
                style={{
                  padding: "7px 12px",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  borderRadius: "var(--r-sm, 8px)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "var(--ink-soft, #9496A6)",
                }}
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}

        {/* Input Fields */}
        <div style={{ marginBottom: 14 }}>
          <label
            className="mono"
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
              color: "var(--ink-soft, #9496A6)",
            }}
          >
            Email Credential
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="admin@getsourced.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#08090E",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "var(--r-sm, 8px)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              color: "var(--ink, #F4F4F6)",
              outline: "none",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#7C3AED";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124, 58, 237, 0.22)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label
            className="mono"
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
              color: "var(--ink-soft, #9496A6)",
            }}
          >
            Security Key / Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#08090E",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "var(--r-sm, 8px)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              color: "var(--ink, #F4F4F6)",
              outline: "none",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#7C3AED";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124, 58, 237, 0.22)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#FF8DA3",
              background: "rgba(255, 94, 126, 0.12)",
              border: "1px solid rgba(255, 94, 126, 0.28)",
              borderRadius: "var(--r-sm, 8px)",
              padding: "10px 12px",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: "var(--coral, #FF5E7E)", fontWeight: 700 }}>✕</span>
            <span>{error}</span>
          </motion.div>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: "var(--r-sm, 8px)",
            background: loading
              ? "rgba(124, 58, 237, 0.4)"
              : "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
            border: "1px solid rgba(124, 58, 237, 0.5)",
            color: "#FFFFFF",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            boxShadow: loading ? "none" : "0 4px 18px rgba(124, 58, 237, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          whileHover={loading ? undefined : { scale: 1.015, y: -1 }}
          whileTap={loading ? undefined : { scale: 0.985 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "admin-spin 0.8s linear infinite",
                }}
              />
              <span>Authenticating clearance...</span>
            </>
          ) : (
            <span>Authenticate Clearance →</span>
          )}
        </motion.button>

        {/* Security Clear Footnote */}
        <div
          className="mono"
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            fontSize: 10.5,
            color: "var(--ink-soft, #9496A6)",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span style={{ color: "#10B981" }}>🔒</span>
          <span>Single-Admin Allowlist Protected</span>
        </div>
      </motion.form>

      {/* Inline Keyframe for Spinner */}
      <style jsx>{`
        @keyframes admin-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
