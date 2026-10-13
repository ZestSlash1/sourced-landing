// Adapted from ObsidianUI's Discover Button. See LICENSE in this directory.
import Link from "next/link";

export function DiscoverButton({ label, href, className = "" }: {
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <Link className={`obsidian-discover-button ${className}`} href={href}>
      <span className="obsidian-discover-button__fill" aria-hidden="true" />
      <span className="obsidian-discover-button__icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </span>
      <span className="obsidian-discover-button__text">{label}</span>
    </Link>
  );
}
