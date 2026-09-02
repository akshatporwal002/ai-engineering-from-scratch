"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { mountLessonFigures?: (root?: ParentNode) => void }
}

export function LegacyFigure({ name }: { name: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const mount = () => {
      if (!active || !root.current || !window.mountLessonFigures) return;
      window.mountLessonFigures(root.current);
      root.current.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select").forEach((control) => {
        const label = control.closest(".lf-ctrl")?.querySelector("label")?.childNodes[0]?.textContent?.trim();
        if (label) control.setAttribute("aria-label", label);
      });
      window.setTimeout(() => { if (active && !root.current?.querySelector(".lf")) setFailed(true); }, 0);
    };
    if (window.mountLessonFigures) mount();
    else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-codeology-lesson-figures="true"]');
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = "/legacy-assets/lesson-figures.js";
        script.dataset.codeologyLessonFigures = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount, { once: true });
      script.addEventListener("error", () => setFailed(true), { once: true });
    }
    return () => { active = false; };
  }, []);
  return (
    <figure className="lesson-legacy-figure" aria-label={`Interactive figure: ${name}`}>
      <div ref={root}><div className="lesson-figure" data-figure={name} /></div>
      {failed && <div className="lesson-render-error" role="status"><strong>Interactive figure unavailable</strong><p>The lesson remains readable. Figure source: <code>{name}</code>.</p></div>}
      <noscript>This interactive figure requires JavaScript; the surrounding lesson explains the same gradient-descent behavior.</noscript>
    </figure>
  );
}
