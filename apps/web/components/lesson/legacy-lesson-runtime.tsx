"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    AIFSProgress?: unknown;
    AIFS_FIGURES?: unknown;
    _mermaidReady?: unknown;
    AIFSContentSource?: {
      isLocal: () => boolean;
      repoUrl: (path: string) => string;
      rawRepoUrl: (path: string) => string;
      localDirectoryFiles: (path: string) => Promise<unknown[]>;
    };
  }
}

function loadScript(source: string, marker: string) {
  return new Promise<HTMLScriptElement>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.dataset.lessonRuntime = marker;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Unable to load ${source}`));
    document.body.appendChild(script);
  });
}

function cleanLessonHref(value: string) {
  const url = new URL(value, window.location.href);
  if (url.origin !== window.location.origin) return value;
  if (url.pathname.endsWith("/lesson.html")) {
    const sourcePath = url.searchParams.get("path") ?? "";
    const match = sourcePath.match(/^phases\/([^/]+)\/([^/]+)$/);
    if (match) return `/lessons/${match[1]}/${match[2]}${url.hash}`;
  }
  const routes: Record<string, string> = {
    "/index.html": "/",
    "/catalog.html": "/catalog",
    "/prereqs.html": "/roadmap",
    "/glossary.html": "/glossary",
    "/about.html": "/about",
    "/credits.html": "/credits",
    "/certifications.html": "/certifications",
  };
  return routes[url.pathname] ? `${routes[url.pathname]}${url.search}${url.hash}` : value;
}

function addLessonSourceBadge(lessonPath: string) {
  const container = document.getElementById("lessonContent");
  if (!container || container.querySelector(".codeology-content-source")) return;
  const sourceUrl = "https://github.com/rohitg00/ai-engineering-from-scratch";
  const baselineCommit = "7c3323508a5186739feecd76838ba1ae962c736f";
  const pinnedPath = lessonPath.split("/").map(encodeURIComponent).join("/");
  const badge = document.createElement("aside");
  badge.className = "codeology-content-source";
  badge.setAttribute("aria-label", "Imported lesson source");
  badge.innerHTML = `<span class="codeology-content-source__summary"><strong class="codeology-content-source__kind">Imported lesson</strong> from <a href="${sourceUrl}" target="_blank" rel="noopener">AI Engineering from Scratch</a> by Rohit Ghumare and contributors · MIT</span><a class="codeology-content-source__pinned" href="${sourceUrl}/tree/${baselineCommit}/${pinnedPath}" target="_blank" rel="noopener">View pinned source</a>`;
  container.insertBefore(badge, container.firstChild);
}

export function LegacyLessonRuntime({
  lessonPath,
  markdown,
  quiz,
  directoryFiles,
  runtime,
}: {
  lessonPath: string;
  markdown: string;
  quiz: unknown;
  directoryFiles: Record<string, unknown[]>;
  runtime: string;
}) {
  useEffect(() => {
    let cancelled = false;
    const scripts: HTMLScriptElement[] = [];
    const markdownUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(markdown)}`;
    const quizUrl = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(quiz))}`;
    window.AIFSContentSource = {
      isLocal: () => true,
      repoUrl: (path) => path.endsWith("/docs/en.md") ? markdownUrl : path.endsWith("/quiz.json") ? quizUrl : "data:text/plain,",
      rawRepoUrl: (path) => path.endsWith("/docs/en.md") ? markdownUrl : path.endsWith("/quiz.json") ? quizUrl : "data:text/plain,",
      localDirectoryFiles: (path) => Promise.resolve(directoryFiles[path] ?? []),
    };
    document.body.dataset.lessonPath = lessonPath;
    document.body.dataset.lessonNext = "true";

    const rewriteLinks = () => {
      document.querySelectorAll<HTMLAnchorElement>(".lesson-layout a[href]").forEach((link) => {
        const clean = cleanLessonHref(link.href);
        if (clean !== link.href) link.href = clean;
      });
    };
    const observer = new MutationObserver(rewriteLinks);
    observer.observe(document.querySelector(".lesson-layout")!, { childList: true, subtree: true });
    let figuresAvailable = true;
    const annotateFigures = () => {
      document.querySelectorAll<HTMLElement>(".lesson-figure[data-figure]").forEach((figure) => {
        const name = figure.dataset.figure?.split(/\s+/, 1)[0] ?? "lesson";
        figure.setAttribute("role", "figure");
        figure.setAttribute("aria-label", `Interactive figure: ${name}`);
        if (!figuresAvailable && !figure.hasChildNodes()) {
          figure.innerHTML = `<div class="lesson-render-error" role="status"><strong>Interactive figure unavailable</strong><p>The lesson remains readable. Figure source: <code>${name}</code>.</p></div>`;
        }
      });
      rewriteLinks();
    };
    const onLessonRendered = () => {
      annotateFigures();
      addLessonSourceBadge(lessonPath);
    };
    document.addEventListener("codeology:lesson-rendered", onLessonRendered);

    const mermaidModule = document.createElement("script");
    mermaidModule.type = "module";
    mermaidModule.dataset.lessonRuntime = "mermaid";
    mermaidModule.textContent = `import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
mermaid.initialize({startOnLoad:false,theme:document.documentElement.dataset.theme === "light" ? "default" : "dark",fontFamily:"JetBrains Mono, ui-monospace, monospace",themeVariables:{fontSize:"13px"},flowchart:{useMaxWidth:true,htmlLabels:true,nodeSpacing:40,rankSpacing:50,padding:12}});
window._mermaidReady=mermaid;`;
    document.body.appendChild(mermaidModule);
    scripts.push(mermaidModule);

    async function start() {
      scripts.push(await loadScript("/legacy-assets/data.js", "data"));
      if (cancelled) return;
      if (!window.AIFSProgress) scripts.push(await loadScript("/legacy-assets/progress.js", "progress"));
      if (cancelled) return;
      if (!window.AIFS_FIGURES) scripts.push(await loadScript("/legacy-assets/figures.js", "figures"));
      if (cancelled) return;
      if (!window.mountLessonFigures) {
        try {
          scripts.push(await loadScript("/legacy-assets/lesson-figures.js", "lesson-figures"));
        } catch {
          figuresAvailable = false;
        }
      }
      if (cancelled) return;
      const lessonScript = document.createElement("script");
      lessonScript.dataset.lessonRuntime = "lesson";
      lessonScript.textContent = runtime;
      document.body.appendChild(lessonScript);
      scripts.push(lessonScript);
      rewriteLinks();
    }

    void start().catch((error: unknown) => { if (!cancelled) console.error(error); });
    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener("codeology:lesson-rendered", onLessonRendered);
      scripts.forEach((script) => script.remove());
      document.querySelector(".codeology-content-source")?.remove();
      delete document.body.dataset.lessonPath;
      delete document.body.dataset.lessonNext;
    };
  }, [directoryFiles, lessonPath, markdown, quiz, runtime]);

  return null;
}
