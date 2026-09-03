"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/track-client";

/** Fires the brief_unlocked event to Umami on first render of a freshly unlocked brief. */
export default function UnlockTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackEvent("brief_unlocked", { slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
