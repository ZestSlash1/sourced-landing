"use client";

import Link from "next/link";
import { MorphIcon } from "morphicons/react";
import { Sparkles } from "lucide";
import SignOutButton from "./sign-out-button";

const TABS = [
  { href: "/admin", label: "Ideas" },
  { href: "/admin/pending", label: "Pending" },
  { href: "/admin/analytics", label: "Analytics" },
] as const;

/**
 * Shared chrome for every signed-in /admin page: the pill topnav (Operate-mode
 * standard pattern, not a sidebar — four pages don't need one) plus a soft
 * violet wash behind it. Everything below the header stays plain white so
 * dense tables and stat grids keep contrast; the color budget is spent on
 * this one band, not smeared across the page.
 */
export default function AdminShell({
  active,
  children,
}: {
  active: (typeof TABS)[number]["href"];
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div
        style={{
          background:
            "radial-gradient(1100px 320px at 18% -10%, rgba(91,79,247,0.16), transparent 60%), radial-gradient(700px 260px at 90% -20%, rgba(255,111,94,0.10), transparent 55%), var(--bg)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "20px 24px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--r-sm)",
                background: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--lime)",
                flexShrink: 0,
              }}
            >
              <MorphIcon icon={Sparkles} size={16} />
            </div>
            <span className="display" style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
              Sourced <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}>Admin</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <nav
              style={{
                display: "inline-flex",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-chip)",
                padding: 4,
                gap: 2,
                boxShadow: "var(--shadow)",
              }}
            >
              {TABS.map((tab) => {
                const isActive = tab.href === active;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    style={{
                      padding: "7px 16px",
                      borderRadius: "var(--r-chip)",
                      fontSize: 13.5,
                      fontWeight: 600,
                      textDecoration: "none",
                      color: isActive ? "#fff" : "var(--ink-soft)",
                      background: isActive ? "var(--violet)" : "transparent",
                      transition: "background .18s ease, color .18s ease",
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
            <SignOutButton />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px 64px" }}>{children}</div>
    </div>
  );
}
