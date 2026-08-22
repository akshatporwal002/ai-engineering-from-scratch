import { readFileSync } from "node:fs";
import path from "node:path";

import { ContentValidationError, loadAcademyProvenance, loadLessonQuiz, loadPhases, type LessonQuiz, type SourceProvenance } from "./public-content";
import { adjacentLessons } from "./query";

export const REFERENCE_LESSON = {
  repositoryPath: "phases/01-math-foundations/08-optimization",
  routeSlug: ["01-math-foundations", "08-optimization"],
  canonical: "/lessons/01-math-foundations/08-optimization",
} as const;

export type LessonDocument = {
  title: string;
  hook: string;
  type: string;
  languages: string;
  prerequisites: string;
  time: string;
  markdown: string;
  quiz: LessonQuiz;
  sourcePath: string;
  sourceUrl: string;
  provenance: SourceProvenance;
  previous?: { name: string; url: string };
  next?: { name: string; url: string };
};

const repositoryRoot = path.resolve(process.cwd(), "../..");
let referenceLesson: LessonDocument | undefined;

function sourceField(markdown: string, label: string) {
  return markdown.match(new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+)$`, "mi"))?.[1]?.trim();
}

function readTrustedSource(relativePath: string) {
  const resolved = path.resolve(repositoryRoot, relativePath);
  if (!resolved.startsWith(repositoryRoot + path.sep)) throw new ContentValidationError(relativePath, "path escapes repository root");
  try {
    return readFileSync(resolved, "utf8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : "source is unavailable";
    throw new ContentValidationError(relativePath, reason);
  }
}

export function isReferenceLessonSlug(slug: string[]) {
  return slug.join("/") === REFERENCE_LESSON.routeSlug.join("/");
}

export function loadReferenceLesson(): LessonDocument {
  if (referenceLesson) return referenceLesson;
  const sourcePath = `${REFERENCE_LESSON.repositoryPath}/docs/en.md`;
  const markdown = readTrustedSource(sourcePath);
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const hook = markdown.match(/^>\s+(.+)$/m)?.[1]?.trim();
  const type = sourceField(markdown, "Type");
  const languages = sourceField(markdown, "Languages?");
  const prerequisites = sourceField(markdown, "Prerequisites");
  const time = sourceField(markdown, "Time");
  const missing = Object.entries({ title, hook, type, languages, prerequisites, time }).find(([, value]) => !value);
  if (missing) throw new ContentValidationError(sourcePath, `${missing[0]}: required lesson metadata is missing`);

  const phases = loadPhases();
  const lesson = phases.flatMap((phase) => phase.lessons).find((item) => item.url.includes("/08-optimization/"));
  if (!lesson) throw new ContentValidationError("site/data.js#PHASES", "lesson 08-optimization is missing");
  const adjacent = adjacentLessons(phases, "optimization");
  referenceLesson = {
    title: title!,
    hook: hook!,
    type: type!,
    languages: languages!,
    prerequisites: prerequisites!,
    time: time!,
    markdown,
    quiz: loadLessonQuiz(`${REFERENCE_LESSON.repositoryPath}/quiz.json`),
    sourcePath,
    sourceUrl: lesson.url,
    provenance: loadAcademyProvenance(),
    previous: adjacent.previous ? { name: adjacent.previous.name, url: adjacent.previous.url } : undefined,
    next: adjacent.next ? { name: adjacent.next.name, url: adjacent.next.url } : undefined,
  };
  return referenceLesson;
}
