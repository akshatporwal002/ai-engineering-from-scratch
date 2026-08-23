"use client";

import { useEffect, useState } from "react";

export function LessonToc({ headings }: { headings: { id: string; text: string; level: number }[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");
  useEffect(() => {
    const elements = headings.map((heading) => document.getElementById(heading.id)).filter((item): item is HTMLElement => Boolean(item));
    let frame = 0;
    let navigationTarget = "";
    const updateActive = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const readingLine = Math.min(window.innerHeight * 0.25, 180);
        const target = navigationTarget ? document.getElementById(navigationTarget) : null;
        if (target && target.getBoundingClientRect().top > readingLine) {
          setActive(navigationTarget);
          return;
        }
        navigationTarget = "";
        let current = elements[0];
        for (const element of elements) {
          if (element.getBoundingClientRect().top > readingLine) break;
          current = element;
        }
        const last = elements.at(-1);
        if (last && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = last;
        if (current?.id) setActive(current.id);
      });
    };
    const followHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (elements.some((element) => element.id === id)) {
        navigationTarget = id;
        setActive(id);
      }
      updateActive();
    };
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("hashchange", followHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("hashchange", followHash);
    };
  }, [headings]);
  return <nav className="lesson-toc" aria-label="On this page"><strong>On this page</strong>{headings.map((heading) => <a className={`lesson-toc__level-${heading.level}`} key={heading.id} href={`#${heading.id}`} aria-current={active === heading.id ? "location" : undefined} onClick={() => setActive(heading.id)}>{heading.text}</a>)}</nav>;
}
