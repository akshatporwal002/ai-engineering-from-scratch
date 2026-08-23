"use client";

import { useEffect } from "react";
import type { PhaseSummary } from "../../lib/content/public-content";

declare global {
  interface Window {
    PHASES?: PhaseSummary[];
    ROADMAP_PREREQS?: Record<string, number[]>;
    AIFSProgress?: unknown;
    CodeologyUI?: unknown;
  }
}

function loadScript(source: string, marker: string) {
  return new Promise<HTMLScriptElement>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.dataset.roadmapRuntime = marker;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Unable to load ${source}`));
    document.body.appendChild(script);
  });
}

export function RoadmapRuntime({ phases, prerequisites }: { phases: PhaseSummary[]; prerequisites: Record<string, number[]> }) {
  useEffect(() => {
    let cancelled = false;
    let roadmapScript: HTMLScriptElement | undefined;
    window.PHASES = phases;
    window.ROADMAP_PREREQS = prerequisites;

    async function start() {
      if (!window.AIFSProgress) await loadScript("/legacy-assets/progress.js", "progress");
      if (cancelled) return;
      if (!window.CodeologyUI) await loadScript("/legacy-assets/ui-controls.js", "ui-controls");
      if (cancelled) return;
      roadmapScript = await loadScript("/legacy-assets/roadmap.js", "roadmap");
    }

    void start().catch((error: unknown) => {
      if (!cancelled) console.error(error);
    });

    return () => {
      cancelled = true;
      roadmapScript?.remove();
    };
  }, [phases, prerequisites]);

  return null;
}
