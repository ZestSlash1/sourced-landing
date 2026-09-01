"use client";

import Link from "next/link";
import { MorphIcon } from "morphicons/react";
import { Sparkles } from "lucide";
import { motion } from "framer-motion";
import SignOutButton from "./sign-out-button";

const TABS = [
  { href: "/admin", label: "Ideas" },
  { href: "/admin/pending", label: "Pending" },
  { href: "/admin/analytics", label: "Analytics" },
] as const;

/**
 * Shared chrome for every signed-in /admin page: the pill topnav (Operate-mode
 * standard pattern, not a sidebar, since four pages don't need one) plus a soft
 * violet wash behind it. Everything below the header stays plain white so
 * dense tables and stat grids keep contrast; the color budget is spent on
 * this one band, not smeared across the page. The active tab's pill slides
 * between tabs via a shared layoutId instead of cross-fading.
 */
export default function AdminShell({
  active,
  children,
}: {
  active: (typeof TABS)[number]["href"];
  children: React.ReactNode;
}) {
  return (
    <div className="admin-shell">
      <div className="admin-topband">
        <div className="admin-topband-inner">
          <motion.div
            className="admin-brand"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
          >
            <div className="admin-brand-mark">
              <MorphIcon icon={Sparkles} size={16} />
            </div>
            <span className="display admin-brand-name">
              Sourced <span>Admin</span>
            </span>
          </motion.div>

          <div className="admin-right">
            <nav className="admin-nav" aria-label="Admin sections">
              {TABS.map((tab) => {
                const isActive = tab.href === active;
                return (
                  <Link key={tab.href} href={tab.href} className={`admin-tab ${isActive ? "is-active" : ""}`}>
                    {isActive && (
                      <motion.span
                        layoutId="admin-active-tab"
                        className="admin-tab-pill"
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      />
                    )}
                    <span style={{ position: "relative" }}>{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
            <SignOutButton />
          </div>
        </div>
      </div>

      <motion.div
        className="admin-main"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 28, delay: 0.05 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
