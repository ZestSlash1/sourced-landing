"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OpportunityWatchButton({ slug, signedIn, initialFollowing, evidenceChanged = false }: {
  slug: string; signedIn: boolean; initialFollowing: boolean; evidenceChanged?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function save(next: boolean) {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/account/watchlist", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, following: next }) });
      if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent(`/feed/${slug}`)}`); return; }
      if (!response.ok) throw new Error("Could not save your shortlist. Please try again.");
      setFollowing(next); setMessage(next ? "Saved. Revisit your shortlist in Account." : "Removed from your shortlist.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save. Please try again."); }
    finally { setPending(false); }
  }
  if (!signedIn) return <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(`/feed/${slug}`)}`}>Sign in to save this opportunity</Link>;
  return <div className="watch-actions">
    <button type="button" className="btn btn-primary" aria-pressed={following} disabled={pending} onClick={() => save(!following)}>
      {pending ? "Saving…" : following ? "Remove from shortlist" : "Save to shortlist"}
    </button>
    {following && evidenceChanged && <button type="button" className="btn" disabled={pending} onClick={() => save(true)}>Mark evidence reviewed</button>}
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
