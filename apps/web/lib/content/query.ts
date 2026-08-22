import type { GlossaryEntry, LessonSummary, PhaseSummary } from "./schemas";

export type LessonWithPhase = LessonSummary & { phase: PhaseSummary };

function normalized(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

function compareText(left: string, right: string) {
  const a = normalized(left);
  const b = normalized(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function allLessons(phases: PhaseSummary[]): LessonWithPhase[] {
  return phases.flatMap((phase) => phase.lessons.map((lesson) => ({ ...lesson, phase })));
}

export function searchLessons(
  phases: PhaseSummary[],
  filters: { query?: string; language?: string; phaseId?: string; sort?: "curriculum" | "name" } = {},
) {
  const query = normalized(filters.query ?? "");
  const language = filters.language ?? "all";
  const phaseId = filters.phaseId ?? "all";
  const results = allLessons(phases)
    .filter((lesson) => {
      const searchable = normalized(`${lesson.name} ${lesson.summary ?? ""} ${lesson.phase.name} ${lesson.lang}`);
      return searchable.includes(query)
        && (language === "all" || lesson.lang.split(",").map((item) => item.trim()).includes(language))
        && (phaseId === "all" || String(lesson.phase.id) === phaseId);
    });
  return filters.sort === "name"
    ? [...results].sort((left, right) => compareText(left.name, right.name) || left.phase.id - right.phase.id || compareText(left.url, right.url))
    : results;
}

export function searchGlossary(entries: GlossaryEntry[], filters: { query?: string; category?: string } = {}) {
  const query = normalized(filters.query ?? "");
  const category = filters.category ?? "all";
  return entries
    .filter((entry) => normalized(`${entry.term} ${entry.aliases.join(" ")} ${entry.means} ${entry.related.join(" ")}`).includes(query)
      && (category === "all" || entry.category === category))
    .sort((left, right) => compareText(left.term, right.term) || compareText(left.slug, right.slug));
}

export function resolveLesson(phases: PhaseSummary[], slugOrUrl: string) {
  const target = normalized(slugOrUrl.replace(/\/$/, ""));
  return allLessons(phases).find((lesson) => {
    const url = normalized(lesson.url.replace(/\/$/, ""));
    const slug = url.split("/").filter(Boolean).at(-1) ?? "";
    const nameSlug = normalized(lesson.name).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return url === target || slug === target || slug.replace(/^\d+-/, "") === target || nameSlug === target;
  });
}

export function adjacentLessons(phases: PhaseSummary[], slugOrUrl: string) {
  const lessons = allLessons(phases);
  const current = resolveLesson(phases, slugOrUrl);
  const index = current ? lessons.findIndex((lesson) => lesson.url === current.url) : -1;
  return {
    previous: index > 0 ? lessons[index - 1] : undefined,
    current,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined,
  };
}

export function resolvePhase(phases: PhaseSummary[], idOrSlug: string) {
  const target = normalized(idOrSlug);
  return phases.find((phase) => String(phase.id) === target || normalized(phase.name).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") === target);
}
