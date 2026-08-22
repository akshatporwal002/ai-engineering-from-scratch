"use client";

import { useEffect, useState } from "react";

export function LessonToc({ headings }: { headings: { id: string; text: string; level: number }[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");
  useEffect(() => {
    const elements = headings.map((heading) => document.getElementById(heading.id)).filter((item): item is HTMLElement => Boolean(item));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      if (visible?.target.id) setActive(visible.target.id);
    }, { rootMargin: "-15% 0px -70% 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);
  return <nav className="lesson-toc" aria-label="On this page"><strong>On this page</strong>{headings.map((heading) => <a className={`lesson-toc__level-${heading.level}`} key={heading.id} href={`#${heading.id}`} aria-current={active === heading.id ? "location" : undefined} onClick={() => setActive(heading.id)}>{heading.text}</a>)}</nav>;
}
