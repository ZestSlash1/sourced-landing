"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        padding: "8px 14px",
        background: "transparent",
        color: "var(--ink-soft)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-sm)",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      Sign out
    </button>
  );
}
