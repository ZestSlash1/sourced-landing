"use client";

import Link from "next/link";
import { MorphIcon } from "morphicons/react";
import { Sparkles } from "lucide";
import { motion } from "framer-motion";
import SignOutButton from "./sign-out-button";
import PipelineBanner from "./pipeline-banner";

const TABS = [
  { href: "/admin", label: "Ideas" },
  { href: "/admin/pending", label: "Pending" },
  { href: "/admin/analytics", label: "Analytics" },
] as const;

/**
 * Shared chrome for every signed-in /admin page:
 * Sleek Dark Obsidian command header with operations badge, layoutId animated navigation
 * pill, quick links to live feed/landing, and integrated pipeline banner.
 */
export default function AdminShell({
  active,
  children,
}: {
  active: (typeof TABS)[number]["href"];
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell" style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <header
        className="admin-topband"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "linear-gradient(180deg, rgba(16, 18, 26, 0.92) 0%, rgba(8, 9, 14, 0.96) 100%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.45)",
        }}
      >
        <div
          className="admin-topband-inner"
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {/* Brand mark & Operations Console badge */}
          <motion.div
            className="admin-brand"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <Link
              href="/admin"
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
            >
              <div
                className="admin-brand-mark"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--r-sm)",
                  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(16, 18, 26, 0.9) 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.45)",
                  color: "var(--lime)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 16px rgba(124, 58, 237, 0.25)",
                }}
              >
                <MorphIcon icon={Sparkles} size={16} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="display admin-brand-name" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Sourced <span style={{ color: "var(--violet-deep)" }}>Admin</span>
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: "0.08em",
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: "rgba(124, 58, 237, 0.12)",
                    border: "1px solid rgba(124, 58, 237, 0.3)",
                    color: "var(--violet-deep)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  OPERATIONS CONSOLE
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Navigation tabs & quick links */}
          <div className="admin-right" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <nav
              className="admin-nav"
              aria-label="Admin sections"
              style={{
                position: "relative",
                display: "flex",
                background: "rgba(22, 24, 36, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "var(--r-chip)",
                padding: "3px",
                gap: 2,
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              {TABS.map((tab) => {
                const isActive = tab.href === active;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`admin-tab ${isActive ? "is-active" : ""}`}
                    style={{
                      position: "relative",
                      padding: "6px 14px",
                      borderRadius: "var(--r-chip)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      color: isActive ? "#ffffff" : "var(--ink-soft)",
                      whiteSpace: "nowrap",
                      zIndex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "color 0.2s ease",
                    }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="admin-active-tab"
                        className="admin-tab-pill"
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(135deg, var(--violet) 0%, #6D28D9 100%)",
                          borderRadius: "var(--r-chip)",
                          boxShadow: "0 2px 10px rgba(124, 58, 237, 0.4)",
                          zIndex: -1,
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      />
                    )}
                    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                      {tab.href === "/admin/analytics" && <span className="admin-live-dot" />}
                      {tab.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/feed"
                target="_blank"
                rel="noreferrer"
                className="admin-view-site"
                title="Open live subscriber feed"
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  textDecoration: "none",
                  padding: "5px 11px",
                  borderRadius: "var(--r-chip)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(22, 24, 36, 0.6)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.18s ease",
                }}
              >
                Live Feed ↗
              </Link>
              <Link
                href="/"
                target="_blank"
                rel="noreferrer"
                className="admin-view-site"
                title="Open public landing page"
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  textDecoration: "none",
                  padding: "5px 11px",
                  borderRadius: "var(--r-chip)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(22, 24, 36, 0.6)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.18s ease",
                }}
              >
                Landing ↗
              </Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className="admin-main"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 28, delay: 0.05 }}
        style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px 64px" }}
      >
        <PipelineBanner />
        {children}
      </motion.div>
    </div>
  );
}
