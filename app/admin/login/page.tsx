"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Single-admin login. No admin routes exist yet to redirect into on success
 * (see sourced-phase3-db-auth-spec.md Track B); this just proves sign-in
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
    <main className="admin-login-wrap">
      <motion.form
        onSubmit={handleSubmit}
        className="admin-login-card"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={error ? { opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -6, 6, 0] } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
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

        <label className="admin-label">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="admin-input"
          style={{ marginBottom: 16 }}
        />

        <label className="admin-label">Password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="admin-input"
          style={{ marginBottom: 20 }}
        />

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-error-banner"
            style={{ marginBottom: 16 }}
          >
            {error}
          </motion.p>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          className="admin-btn admin-btn-primary"
          style={{ width: "100%", padding: "10px 12px", borderRadius: "var(--r-sm)" }}
          whileHover={loading ? undefined : { scale: 1.02 }}
          whileTap={loading ? undefined : { scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </motion.button>
      </motion.form>
    </main>
  );
}
