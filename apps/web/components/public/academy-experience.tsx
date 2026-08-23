"use client";

import { useEffect, useRef } from "react";
import type { PhaseSummary } from "../../lib/content/public-content";

const STORAGE_KEY = "aifs:progress:v1";
const volumes = [
  [1, "foundations", "Foundations", "Math, Tooling, and Classical Machine Learning", "00–02"],
  [2, "deep-learning", "Deep Learning", "Networks, Vision, and Speech", "03, 04, 06"],
  [3, "language", "Language", "NLP Foundations and the Transformer", "05, 07"],
  [4, "llms", "Large Language Models", "Generation, Reinforcement, Pretraining, and Engineering", "08–11"],
  [5, "agents", "Agents", "Multimodality, Protocols, Autonomy, and Swarms", "12–16"],
  [6, "production", "Production", "Infrastructure, Safety, and Capstones", "17–19"],
] as const;

type StoredProgress = { lessons?: Record<string, { completedAt?: number | null }> };

function readProgress(): StoredProgress {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}

function lessonPath(url: string) {
  return url.match(/(phases\/[^/]+\/[^/]+)\/?$/)?.[1] ?? "";
}

function isComplete(path: string) {
  return Boolean(path && readProgress().lessons?.[path]?.completedAt);
}

function setComplete(path: string, complete: boolean) {
  const progress = readProgress();
  progress.lessons ??= {};
  progress.lessons[path] = { ...progress.lessons[path], completedAt: complete ? Date.now() : null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function roman(value: number) {
  const pairs: [string, number][] = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
  let remaining = value;
  return pairs.reduce((result, [symbol, amount]) => {
    while (remaining >= amount) { result += symbol; remaining -= amount; }
    return result;
  }, "");
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export function AcademyExperience({ html, phases, glossaryCount }: { html: string; phases: PhaseSummary[]; glossaryCount: number }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let currentPhase = -1;
    let returnFocus: HTMLElement | null = null;
    let copyTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanups: Array<() => void> = [];
    const listen = <K extends keyof HTMLElementEventMap>(target: HTMLElement | Document, name: K, handler: (event: HTMLElementEventMap[K]) => void) => {
      target.addEventListener(name, handler as EventListener);
      cleanups.push(() => target.removeEventListener(name, handler as EventListener));
    };

    const completed = (phase: PhaseSummary) => phase.lessons.filter((lesson) => lesson.status === "complete" || isComplete(lessonPath(lesson.url))).length;

    const renderStats = () => {
      const total = phases.reduce((sum, phase) => sum + phase.lessons.length, 0);
      const done = phases.reduce((sum, phase) => sum + completed(phase), 0);
      const completePhases = phases.filter((phase) => phase.status === "complete").length;
      const values: Array<[string, string]> = [
        ['[data-stat="complete-frac"]', `${done} / ${total}`],
        ['[data-stat="phases-frac"]', `${completePhases} / ${phases.length}`],
        ['[data-stat="glossary-count"]', String(glossaryCount)],
      ];
      values.forEach(([selector, value]) => { const node = root.querySelector(selector); if (node) node.textContent = value; });
      const bars: Array<[string, number]> = [
        ['[data-bar="complete"]', total ? done / total * 100 : 0],
        ['[data-bar="phases"]', phases.length ? completePhases / phases.length * 100 : 0],
        ['[data-bar="languages"]', 100], ['[data-bar="glossary"]', glossaryCount ? 100 : 0],
      ];
      bars.forEach(([selector, percent]) => {
        const node = root.querySelector<HTMLElement>(selector);
        node?.style.setProperty("--bar-pct", `${Math.max(0, Math.min(100, percent)).toFixed(1)}%`);
        node?.setAttribute("data-target-pct", percent.toFixed(1));
      });
    };

    const phaseGrid = root.querySelector<HTMLElement>("#phasesGrid");
    const renderPhases = () => {
      if (!phaseGrid) return;
      phaseGrid.replaceChildren(...phases.map((phase, index) => {
        const row = element("div", "toc-row");
        row.dataset.phase = String(index);
        row.setAttribute("role", "button");
        row.tabIndex = 0;
        row.setAttribute("aria-haspopup", "dialog");
        row.setAttribute("aria-label", `Open Phase ${String(phase.id).padStart(2, "0")}: ${phase.name}`);
        row.style.setProperty("--stagger-delay", `${index * 30}ms`);
        const number = element("span", "toc-num"); number.textContent = `${roman(phase.id)}.`;
        const identity = element("div");
        const status = element("span", `toc-status ${phase.status.replaceAll(" ", "-")}`);
        const name = element("span", "toc-name"); name.textContent = phase.name;
        identity.append(status, name);
        const progress = element("span", "toc-meta"); progress.textContent = `${completed(phase)} / ${phase.lessons.length}`;
        const phaseNumber = element("span", "toc-meta"); phaseNumber.textContent = String(phase.id).padStart(2, "0");
        row.append(number, identity, progress, phaseNumber);
        return row;
      }));
    };

    const books = root.querySelector<HTMLElement>("#booksGrid");
    if (books) books.replaceChildren(...volumes.map(([number, slug, title, subtitle, phaseRange], index) => {
      const card = element("div", "book-card reveal");
      if (index) card.style.setProperty("--stagger-delay", `${index * 60}ms`);
      const volume = element("span", "vol"); volume.textContent = `VOL_00${number}`;
      const heading = element("h3"); heading.textContent = title;
      const copy = element("p"); copy.textContent = `${subtitle} · phases ${phaseRange}`;
      const downloads = element("div", "dl");
      for (const format of ["epub", "pdf"]) {
        const link = element("a");
        link.href = `https://github.com/rohitg00/ai-engineering-from-scratch/releases/latest/download/aiefs-vol${number}-${slug}.${format}`;
        link.textContent = format.toUpperCase();
        downloads.append(link);
      }
      card.append(volume, heading, copy, downloads);
      return card;
    }));

    const overlay = root.querySelector<HTMLElement>("#modalOverlay");
    const modal = root.querySelector<HTMLElement>("#modal");
    const close = root.querySelector<HTMLButtonElement>("#modalClose");
    const modalLessons = root.querySelector<HTMLElement>("#modalLessons");
    if (overlay && modal && close) {
      overlay.setAttribute("aria-hidden", "true");
      overlay.inert = true;
      modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "modalTitle"); modal.setAttribute("aria-describedby", "modalDesc");
      close.setAttribute("aria-label", "Close phase details");
    }

    const renderModal = () => {
      const phase = phases[currentPhase];
      if (!phase || !modalLessons) return;
      const userDone = phase.lessons.filter((lesson) => isComplete(lessonPath(lesson.url))).length;
      modalLessons.replaceChildren(...phase.lessons.map((lesson) => {
        const path = lessonPath(lesson.url);
        const userComplete = isComplete(path);
        const canOpen = Boolean(path && (lesson.status === "complete" || userComplete));
        const row = element("div", `modal-lesson${userComplete ? " user-done" : ""}`);
        const open = element(canOpen ? "a" : "span", `modal-lesson-open${canOpen ? "" : " is-unavailable"}`);
        if (open instanceof HTMLAnchorElement) {
          open.href = `/lessons/${path}`;
          open.setAttribute("aria-label", `Open lesson: ${lesson.name}`);
        } else open.setAttribute("aria-disabled", "true");
        const lessonCopy = element("span", "modal-lesson-copy");
        const lessonName = element("span", "modal-lesson-name"); lessonName.textContent = lesson.name;
        const meta = element("span", "modal-lesson-meta");
        const type = element("span", "modal-lesson-type"); type.dataset.type = lesson.type; type.textContent = lesson.type;
        const dot = element("span"); dot.setAttribute("aria-hidden", "true"); dot.textContent = "·";
        const language = element("span", "modal-lesson-lang"); language.textContent = lesson.lang;
        meta.append(type, dot, language); lessonCopy.append(lessonName, meta);
        const cta = element("span", "modal-lesson-cta"); cta.textContent = canOpen ? (userComplete ? "Review →" : "Open lesson →") : "Coming soon";
        open.append(lessonCopy, cta); row.append(open);
        if (canOpen) {
          const toggle = element("button", `modal-lesson-toggle${userComplete ? " done" : ""}`);
          toggle.type = "button"; toggle.dataset.path = path;
          toggle.title = userComplete ? "Mark as not done" : "Mark complete";
          toggle.setAttribute("aria-label", toggle.title);
          const check = element("span", "modal-lesson-check"); check.setAttribute("aria-hidden", "true"); check.textContent = userComplete ? "✓" : "";
          const label = element("span", "modal-lesson-toggle-label"); label.textContent = userComplete ? "Done" : "Mark done";
          toggle.append(check, label);
          toggle.addEventListener("click", () => { setComplete(path, !userComplete); renderModal(); renderPhases(); renderStats(); });
          row.append(toggle);
        }
        return row;
      }));
      const progress = root.querySelector<HTMLElement>("#modalProgress");
      const bar = root.querySelector<HTMLElement>("#modalProgressBar");
      const fill = root.querySelector<HTMLElement>("#modalProgressBarFill");
      const percent = Math.round(userDone / phase.lessons.length * 100);
      if (progress) { progress.style.display = ""; progress.textContent = `${userDone} of ${phase.lessons.length} lessons complete · ${percent}%`; }
      if (bar && fill) {
        bar.style.display = ""; bar.setAttribute("role", "progressbar"); bar.setAttribute("aria-label", `${phase.name} progress`);
        bar.setAttribute("aria-valuemin", "0"); bar.setAttribute("aria-valuemax", "100"); bar.setAttribute("aria-valuenow", String(percent));
        fill.style.transform = `scaleX(${percent / 100})`;
      }
    };

    const openModal = (index: number) => {
      if (!overlay || !close || !phases[index]) return;
      currentPhase = index; returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const phase = phases[index];
      const number = root.querySelector("#modalPhaseNum"); if (number) number.textContent = `PHASE ${String(phase.id).padStart(2, "0")}`;
      const title = root.querySelector("#modalTitle"); if (title) title.textContent = phase.name;
      const description = root.querySelector("#modalDesc"); if (description) description.textContent = phase.desc;
      renderModal(); overlay.inert = false; overlay.classList.add("open"); overlay.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
      requestAnimationFrame(() => close.focus());
    };
    const closeModal = () => {
      if (!overlay?.classList.contains("open")) return;
      overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true"); overlay.inert = true; document.body.style.overflow = "";
      returnFocus?.focus(); returnFocus = null;
    };

    renderStats(); renderPhases();
    listen(root, "click", (event) => {
      const target = event.target as HTMLElement;
      const row = target.closest<HTMLElement>(".toc-row");
      if (row?.dataset.phase) openModal(Number(row.dataset.phase));
      if (target === overlay) closeModal();
    });
    listen(root, "keydown", (event) => {
      const target = event.target as HTMLElement;
      const row = target.closest<HTMLElement>(".toc-row");
      if (row && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openModal(Number(row.dataset.phase)); }
    });
    if (close) listen(close, "click", closeModal);
    listen(document, "keydown", (event) => {
      if (event.key === "Escape") closeModal();
      if (event.key !== "Tab" || !overlay?.classList.contains("open") || !modal) return;
      const focusable = [...modal.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });

    const reset = root.querySelector<HTMLButtonElement>("#modalReset");
    if (reset) listen(reset, "click", () => {
      if (!window.confirm("Clear all your local progress (quiz answers and completed lessons)? This cannot be undone.")) return;
      localStorage.removeItem(STORAGE_KEY); renderModal(); renderPhases(); renderStats();
    });

    const copy = root.querySelector<HTMLButtonElement>("#copyBtn");
    const copyLabel = root.querySelector<HTMLElement>("#copyBtnLabel");
    const command = root.querySelector<HTMLElement>("#cloneCmd")?.textContent ?? "";
    if (copy && copyLabel) listen(copy, "click", async () => {
      try {
        await navigator.clipboard.writeText(command); copyLabel.textContent = "copied"; copy.classList.add("copied"); copy.setAttribute("aria-label", "Command copied");
      } catch { copyLabel.textContent = "retry"; copy.setAttribute("aria-label", "Copy failed. Try again"); }
      clearTimeout(copyTimer); copyTimer = setTimeout(() => { copyLabel.textContent = "copy"; copy.classList.remove("copied"); copy.setAttribute("aria-label", "Copy command"); }, 1500);
    });

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
    const reveal = [...root.querySelectorAll<HTMLElement>(".reveal, .fade-in, .stat-row-bar, .ascii-rule, .toc-row")];
    if (reduced || !window.IntersectionObserver) reveal.forEach((node) => node.classList.add("in-view", "visible"));
    else {
      document.body.classList.add("js-anim");
      const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view", "visible"); observer.unobserve(entry.target);
      }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      reveal.forEach((node) => observer.observe(node)); cleanups.push(() => observer.disconnect());
    }

    return () => { cleanups.forEach((cleanup) => cleanup()); clearTimeout(copyTimer); document.body.style.overflow = ""; document.body.classList.remove("js-anim"); };
  }, [glossaryCount, phases]);

  return <main id="main-content" ref={rootRef} dangerouslySetInnerHTML={{ __html: html }} />;
}
