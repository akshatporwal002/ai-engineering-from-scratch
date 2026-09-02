"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./client";

type AuthState = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signIn(provider: "github" | "google"): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(client));
  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = client.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, [client]);
  useEffect(() => {
    if (!session) return;
    try {
      const key = "aifs:progress:v1";
      const local = JSON.parse(localStorage.getItem(key) ?? "{}") as { lessons?: Record<string, { completedAt?: number | null; answers?: Record<string, unknown>; visitedAt?: number | null }> };
      const lessons = Object.entries(local.lessons ?? {}).map(([lesson_path, value]) => ({
        lesson_path,
        answers: value.answers ?? {},
        completed: Boolean(value.completedAt),
        completion_changed_at: value.completedAt ? new Date(value.completedAt).toISOString() : null,
        visited_at: value.visitedAt ? new Date(value.visitedAt).toISOString() : null,
      }));
      fetch("/api/v1/progress/reconcile", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ lessons }) })
        .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("progress reconciliation failed")))
        .then((state: { lessons: Array<{ lesson_path: string; completed: boolean; completion_changed_at?: string; visited_at?: string; answers?: Record<string, unknown> }> }) => {
          const merged = { ...local, lessons: { ...(local.lessons ?? {}) } };
          for (const lesson of state.lessons) merged.lessons[lesson.lesson_path] = { completedAt: lesson.completed && lesson.completion_changed_at ? Date.parse(lesson.completion_changed_at) : null, visitedAt: lesson.visited_at ? Date.parse(lesson.visited_at) : null, answers: lesson.answers ?? {} };
          localStorage.setItem(key, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent("codeology:progress-reconciled"));
        }).catch(() => undefined);
    } catch { /* Corrupt anonymous progress remains local and never blocks sign-in. */ }
  }, [session]);
  const value = useMemo<AuthState>(() => ({
    configured: Boolean(client), loading, session, user: session?.user ?? null,
    async signIn(provider) {
      if (!client) return;
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (error) throw error;
    },
    async signOut() { if (client) await client.auth.signOut(); },
  }), [client, loading, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
