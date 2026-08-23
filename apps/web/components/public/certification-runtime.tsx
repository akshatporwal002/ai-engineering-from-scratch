"use client";

import { useEffect } from "react";
import type { CertificationRuntimeData, PhaseSummary } from "../../lib/content/public-content";

declare global {
  interface Window {
    CERTIFICATIONS?: CertificationRuntimeData;
    PHASES?: PhaseSummary[];
    AIFSProgress?: unknown;
    AIFSCertProgress?: unknown;
  }
}

function loadScript(source: string, marker: string) {
  return new Promise<HTMLScriptElement>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.dataset.certificationRuntime = marker;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Unable to load ${source}`));
    document.body.appendChild(script);
  });
}

export function CertificationRuntime({
  kind,
  track,
  data,
  phases,
}: {
  kind: "catalog" | "track";
  track?: string;
  data: CertificationRuntimeData;
  phases: PhaseSummary[];
}) {
  useEffect(() => {
    let cancelled = false;
    let certificationScript: HTMLScriptElement | undefined;
    window.CERTIFICATIONS = data;
    window.PHASES = phases;
    document.body.dataset.certPage = kind;
    document.body.dataset.certNext = "true";
    if (track) document.body.dataset.certTrack = track;

    async function start() {
      if (!window.AIFSProgress) await loadScript("/legacy-assets/progress.js", "progress");
      if (cancelled) return;
      if (!window.AIFSCertProgress) await loadScript("/legacy-assets/certification-progress.js", "certification-progress");
      if (cancelled) return;
      certificationScript = await loadScript("/legacy-assets/certifications.js", "certifications");
    }

    void start().catch((error: unknown) => {
      if (!cancelled) console.error(error);
    });

    return () => {
      cancelled = true;
      certificationScript?.remove();
      delete document.body.dataset.certPage;
      delete document.body.dataset.certNext;
      delete document.body.dataset.certTrack;
    };
  }, [data, kind, phases, track]);

  return null;
}
