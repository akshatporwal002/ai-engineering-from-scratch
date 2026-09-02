"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../../lib/auth/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    const client = getSupabaseClient();
    const code = new URLSearchParams(window.location.search).get("code");
    if (!client || !code) { router.replace("/"); return; }
    client.auth.exchangeCodeForSession(code).finally(() => router.replace("/"));
  }, [router]);
  return <main id="main-content" className="public-page"><p role="status">Completing secure sign-in…</p></main>;
}
