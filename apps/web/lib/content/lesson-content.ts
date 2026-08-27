import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { ContentValidationError, loadAcademyProvenance, loadLessonQuiz, loadPhases, validateContent, type LessonQuiz, type SourceProvenance } from "./public-content";
import { internalLessonUrl } from "./query";
import { lessonQuizSchema } from "./schemas";

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
  directoryFiles: Record<string, Array<{ name: string; path: string; size: number; description: string; html_url: string }>>;
  routeSlug: string[];
};

const repositoryRoot = path.resolve(process.cwd(), "../..");
let referenceLesson: LessonDocument | undefined;
let curriculumLessons: LessonDocument[] | undefined;
let curriculumPaths: string[] | undefined;

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

function localLessonFile(relativePath: string) {
  const content = readTrustedSource(relativePath);
  const resolved = path.resolve(repositoryRoot, relativePath);
  const description = content.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
  return {
    name: path.basename(relativePath),
    path: relativePath,
    size: statSync(resolved).size,
    description,
    html_url: `https://github.com/akshatporwal002/ai-engineering-from-scratch/blob/main/${relativePath}`,
  };
}

function lessonSlug(relativePath: string) {
  const match = relativePath.match(/^phases\/([^/]+)\/([^/]+)$/);
  if (!match) throw new ContentValidationError(relativePath, "lesson path must be phases/<phase>/<lesson>");
  return [match[1], match[2]];
}

function lessonDirectoryFiles(lessonPath: string, directory: "outputs" | "code") {
  const relativeDirectory = `${lessonPath}/${directory}`;
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory);
  if (!existsSync(absoluteDirectory)) return [];
  return readdirSync(absoluteDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .sort((left, right) => left.name.localeCompare(right.name, "en-US"))
    .map((entry) => localLessonFile(`${relativeDirectory}/${entry.name}`));
}

function loadCompatibleLessonQuiz(lessonPath: string, title: string): LessonQuiz {
  const quizPath = `${lessonPath}/quiz.json`;
  if (!existsSync(path.join(repositoryRoot, quizPath))) return { lesson: path.basename(lessonPath), title, questions: [] };
  const raw = JSON.parse(readTrustedSource(quizPath)) as unknown;
  return Array.isArray(raw)
    ? validateContent(lessonQuizSchema, { lesson: path.basename(lessonPath), title, questions: raw }, quizPath)
    : loadLessonQuiz(quizPath);
}

function lessonDocument(lessonPath: string): LessonDocument {
  const sourcePath = `${lessonPath}/docs/en.md`;
  const markdown = readTrustedSource(sourcePath);
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const hook = markdown.match(/^>\s+(.+)$/m)?.[1]?.trim() ?? "";
  const type = sourceField(markdown, "Type") ?? "Learn";
  const languages = sourceField(markdown, "Languages?") ?? "";
  const prerequisites = sourceField(markdown, "Prerequisites") ?? "None";
  const time = sourceField(markdown, "Time") ?? "Self-paced";
  if (!title) throw new ContentValidationError(sourcePath, "title: required heading is missing");
  const phases = loadPhases();
  const flat = phases.flatMap((phase) => phase.lessons.map((lesson) => ({ phase, lesson })));
  const matched = flat.find(({ lesson }) => lesson.url.includes(`/${lessonPath}/`));
  const index = matched ? flat.findIndex(({ lesson }) => lesson.url === matched.lesson.url) : -1;
  const adjacent = index >= 0 ? { previous: flat[index - 1], next: flat[index + 1] } : {};
  const quiz = loadCompatibleLessonQuiz(lessonPath, title);
  return {
    title,
    hook,
    type,
    languages,
    prerequisites,
    time,
    markdown,
    quiz,
    sourcePath,
    sourceUrl: matched?.lesson.url ?? `https://github.com/akshatporwal002/ai-engineering-from-scratch/tree/main/${lessonPath}`,
    provenance: loadAcademyProvenance(),
    previous: adjacent.previous ? { name: adjacent.previous.lesson.name, url: internalLessonUrl(adjacent.previous.lesson.url) } : undefined,
    next: adjacent.next ? { name: adjacent.next.lesson.name, url: internalLessonUrl(adjacent.next.lesson.url) } : undefined,
    directoryFiles: {
      [`${lessonPath}/outputs`]: lessonDirectoryFiles(lessonPath, "outputs"),
      [`${lessonPath}/code`]: lessonDirectoryFiles(lessonPath, "code"),
    },
    routeSlug: lessonSlug(lessonPath),
  };
}

function discoverCurriculumPaths() {
  curriculumPaths ??= readdirSync(path.join(repositoryRoot, "phases"), { withFileTypes: true })
    .filter((phase) => phase.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name, "en-US"))
    .flatMap((phase) => readdirSync(path.join(repositoryRoot, "phases", phase.name), { withFileTypes: true })
      .filter((lesson) => lesson.isDirectory() && existsSync(path.join(repositoryRoot, "phases", phase.name, lesson.name, "docs", "en.md")))
      .sort((left, right) => left.name.localeCompare(right.name, "en-US"))
      .map((lesson) => `phases/${phase.name}/${lesson.name}`));
  return curriculumPaths;
}

export function loadCurriculumLessons() {
  curriculumLessons ??= discoverCurriculumPaths().map(lessonDocument);
  return curriculumLessons;
}

export function loadCurriculumLesson(slug: string[]) {
  const pathKey = `phases/${slug.join("/")}`;
  return discoverCurriculumPaths().includes(pathKey) ? lessonDocument(pathKey) : undefined;
}

export function isReferenceLessonSlug(slug: string[]) {
  return slug.join("/") === REFERENCE_LESSON.routeSlug.join("/");
}

export function loadReferenceLesson(): LessonDocument {
  if (referenceLesson) return referenceLesson;
  referenceLesson = lessonDocument(REFERENCE_LESSON.repositoryPath);
  return referenceLesson;
}
