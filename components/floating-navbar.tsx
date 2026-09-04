"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MorphIcon } from "morphicons/react";
import { Menu, X } from "lucide";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface NavItem {
  label: string;
  href: string;
  matchPrefix?: string;
  icon: ReactNode;
}

const baseNavItems: NavItem[] = [
  {
    label: "How it works",
    href: "#how",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
  {
    label: "API match",
    href: "#apis",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v8" />
        <path d="m4.93 10.93 4.24 4.24" />
        <path d="M2 18h8" />
        <path d="M20 18h2" />
        <path d="m19.07 10.93-4.24 4.24" />
        <path d="M22 22h-4" />
        <path d="m16 16-2 2" />
      </svg>
    ),
  },
  {
    label: "Sample idea",
    href: "#sample",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Pricing",
    href: "#pricing",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Feed",
    href: "/feed",
    matchPrefix: "/feed",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    label: "Methodology",
    href: "/methodology",
    matchPrefix: "/methodology",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
];

export default function FloatingNavbar({
  initialUserEmail,
}: {
  initialUserEmail?: string | null;
}) {
  const pathname = usePathname() || "/";
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail ?? null);
  const [activeTab, setActiveTab] = useState<string>("How it works");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Sync auth state on client
  useEffect(() => {
    if (initialUserEmail !== undefined) {
      setUserEmail(initialUserEmail);
    }
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialUserEmail]);

  const isHome = pathname === "/";

  // Account / Login item
  const accountItem: NavItem = userEmail
    ? {
        label: "Account",
        href: "/account",
        matchPrefix: "/account",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        ),
      }
    : {
        label: "Log in",
        href: "/login",
        matchPrefix: "/login",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" x2="3" y1="12" y2="12" />
          </svg>
        ),
      };

  const navItems = [...baseNavItems, accountItem];

  // Route-aware and scroll-spy active state
  useEffect(() => {
    if (!isHome) {
      const match = navItems.find(
        (item) => item.matchPrefix && pathname.startsWith(item.matchPrefix)
      );
      if (match) {
        setActiveTab(match.label);
      } else {
        setActiveTab("");
      }
      return;
    }

    // On homepage, run scroll spy
    const sections = [
      { id: "pricing", label: "Pricing" },
      { id: "sample", label: "Sample idea" },
      { id: "apis", label: "API match" },
      { id: "how", label: "How it works" },
    ];

    const onScroll = () => {
      const scrollY = window.scrollY + 200;
      let current = "How it works";
      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (el && el.offsetTop <= scrollY) {
          current = section.label;
          break;
        }
      }
      setActiveTab(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, isHome]);

  // Don't render customer floating navbar inside /admin views
  if (pathname.startsWith("/admin")) {
    return null;
  }

  // Resolve target href (if on home page, "#section", if on interior page, "/#section")
  function resolveHref(href: string) {
    if (href.startsWith("#")) {
      return isHome ? href : `/${href}`;
    }
    return href;
  }

  return (
    <nav ref={navRef} className="floating-nav" aria-label="Main navigation">
      <div className="floating-nav-pill">
        <Link href="/" className="nav-brand" aria-label="Sourced home">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="brand-name">Sourced</span>
        </Link>

        <div className="nav-dock" role="navigation" aria-label="Dock navigation">
          {navItems.map((item) => {
            const targetHref = resolveHref(item.href);
            const isCurrent = activeTab === item.label;
            return (
              <Link
                key={item.label}
                href={targetHref}
                className={`nav-dock-item ${isCurrent ? "is-active" : ""}`}
                onClick={() => {
                  setActiveTab(item.label);
                  if (item.href.startsWith("#") && isHome) {
                    const id = item.href.slice(1);
                    const el = document.getElementById(id);
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth" });
                    }
                  }
                }}
              >
                <span className="dock-icon">{item.icon}</span>
                <span className="dock-label">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <Link className="nav-cta-pill" href={resolveHref("#pricing")}>
          <span>Get started</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>

        <button
          type="button"
          className="nav-burger-pill"
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileNavOpen((v) => !v)}
        >
          <MorphIcon icon={mobileNavOpen ? X : Menu} size={18} />
        </button>
      </div>

      {mobileNavOpen && (
        <div className="mobile-floating-drawer">
          {navItems.map((item) => {
            const targetHref = resolveHref(item.href);
            return (
              <Link
                key={item.label}
                href={targetHref}
                onClick={() => {
                  setActiveTab(item.label);
                  setMobileNavOpen(false);
                }}
              >
                <span className="dock-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            className="mobile-cta-btn"
            href={resolveHref("#pricing")}
            onClick={() => setMobileNavOpen(false)}
          >
            Get started
          </Link>
        </div>
      )}
    </nav>
  );
}
