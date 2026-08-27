import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import {
  assessmentSchema,
  certificationProgramSchema,
  certificationTrackSchema,
  glossaryEntrySchema,
  lessonQuizSchema,
  phaseSchema,
  routeMetadataSchema,
  sourceProvenanceSchema,
  type Assessment,
  type CertificationProgram,
  type CertificationTrack,
  type GlossaryEntry,
  type LessonQuiz,
  type PhaseSummary,
  type RouteMetadata,
  type SourceProvenance,
} from "./schemas";

export type {
  Assessment,
  AssessmentQuestion,
  CertificationProgram,
  CertificationTrack,
  GlossaryEntry,
  LessonQuiz,
  LessonSummary,
  PhaseSummary,
  RouteMetadata,
  SourceProvenance,
} from "./schemas";

const repositoryRoot = path.resolve(process.cwd(), "../..");
const zRecordOfNumberArrays = z.record(z.string(), z.array(z.number().int().nonnegative()));

export type EditorialPage = {
  slug: "about" | "credits" | "assurance" | "cv-analysis";
  title: string;
  description: string;
  styles: string;
  html: string;
};

export type AcademyLegacyPage = {
  styles: string;
  html: string;
};

export type GlossaryLegacyPage = {
  styles: string;
  categories: string[];
};

export type RoadmapLegacyPage = {
  styles: string;
  html: string;
  runtime: string;
};

export type CertificationLegacyPage = {
  styles: string;
  html: string;
  runtime: string;
  progressRuntime: string;
  certificationProgressRuntime: string;
};

export type AssessmentLegacyPage = {
  styles: string;
  html: string;
};

export type CertificationRuntimeData = {
  program: CertificationProgram;
  tracks: CertificationTrack[];
  lessonsByPath: Record<string, unknown>;
  assessmentsById: Record<string, unknown>;
};

// Tailwind's form-control reset is global in the experiment. The maintained
// static page intentionally starts from each browser's native control metrics,
// so restore that baseline before its route stylesheet is applied.
const roadmapControlBaseline = `.roadmap-page :where(button, input, select, textarea) {
  font: revert;
}`;

const certificationControlBaseline = `.cert-page :where(ul, ol) {
  list-style: revert;
}
.search-toggle:has(> span) {
  font: revert;
}`;

function readRepositoryFile(relativePath: string) {
  const resolved = path.resolve(repositoryRoot, relativePath);
  if (!resolved.startsWith(repositoryRoot + path.sep)) throw new ContentValidationError(relativePath, "path escapes repository root");
  return readFileSync(resolved, "utf8");
}

export class ContentValidationError extends Error {
  constructor(public readonly source: string, reason: string) {
    super(`Invalid content at ${source}: ${reason}`);
    this.name = "ContentValidationError";
  }
}

function readRepositoryJson(relativePath: string): unknown {
  try {
    return JSON.parse(readRepositoryFile(relativePath));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown JSON parse error";
    throw new ContentValidationError(relativePath, reason);
  }
}

export function validateContent<T>(schema: z.ZodType<T>, value: unknown, source: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const reason = result.error.issues
    .map((issue) => `${issue.path.length ? issue.path.join(".") : "<root>"}: ${issue.message}`)
    .join("; ");
  throw new ContentValidationError(source, reason);
}

const cache = new Map<string, unknown>();
function cached<T>(key: string, load: () => T): T {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as T;
}

function extractJsonConstant<T>(source: string, name: string): T {
  const marker = `const ${name} = `;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing generated constant: ${name}`);
  const start = markerIndex + marker.length;
  const opener = source[start];
  const closer = opener === "[" ? "]" : "}";
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === opener) depth += 1;
    else if (character === closer && --depth === 0) return JSON.parse(source.slice(start, index + 1)) as T;
  }
  throw new Error(`Unterminated generated constant: ${name}`);
}

let generatedCache: string | undefined;
function generatedData() {
  generatedCache ??= readRepositoryFile("site/data.js");
  return generatedCache;
}

export function loadPhases(): PhaseSummary[] {
  return cached("phases", () => validateContent(phaseSchema.array(), extractJsonConstant<unknown>(generatedData(), "PHASES"), "site/data.js#PHASES"));
}

export function loadRoadmapPrerequisites(): Record<string, number[]> {
  return cached("roadmap-prerequisites", () => validateContent(
    zRecordOfNumberArrays,
    extractJsonConstant<unknown>(generatedData(), "ROADMAP_PREREQS"),
    "site/data.js#ROADMAP_PREREQS",
  ));
}

export function loadRoadmapLegacyPage(): RoadmapLegacyPage {
  return cached("roadmap-legacy-page", () => {
    const source = readRepositoryFile("site/prereqs.html");
    const main = source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    if (!main) throw new Error("Legacy roadmap page is missing its main content");
    return {
      styles: `${readRepositoryFile("site/style.css")}\n${roadmapControlBaseline}\n${readRepositoryFile("site/roadmap.css")}\n${readRepositoryFile("site/codeology.css")}`,
      html: rewriteLegacyLinks(main),
      runtime: readRepositoryFile("site/roadmap.js"),
    };
  });
}

export function loadGlossary(): GlossaryEntry[] {
  return cached("glossary", () => validateContent(glossaryEntrySchema.array(), extractJsonConstant<unknown>(generatedData(), "GLOSSARY"), "site/data.js#GLOSSARY"));
}

export function loadGlossaryLegacyPage(): GlossaryLegacyPage {
  return cached("glossary-legacy-page", () => {
    const source = readRepositoryFile("site/glossary.html");
    const routeStyles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
    if (!routeStyles) throw new Error("Legacy glossary page is missing its route styles");
    return {
      styles: `${readRepositoryFile("site/style.css")}\n${readRepositoryFile("site/codeology.css")}\n${routeStyles}\n.glossary-page button, .glossary-page input { line-height: normal; }\n.glossary-entry:focus-visible { outline: -webkit-focus-ring-color auto 1px; outline-offset: 0; }`,
      categories: validateContent(
        z.array(z.string().min(1)),
        extractJsonConstant<unknown>(generatedData(), "GLOSSARY_CATEGORY_ORDER"),
        "site/data.js#GLOSSARY_CATEGORY_ORDER",
      ),
    };
  });
}

export function loadCertificationProgram(): CertificationProgram {
  const source = "certifications/claude/program.json";
  return cached(source, () => validateContent(certificationProgramSchema, readRepositoryJson(source), source));
}

export function loadCertificationTracks(): CertificationTrack[] {
  return cached("certification-tracks", () => readdirSync(path.join(repositoryRoot, "certifications/claude/tracks"))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const source = `certifications/claude/tracks/${name}`;
      return validateContent(certificationTrackSchema, readRepositoryJson(source), source);
    }));
}

export function loadCertificationTrack(slug: string): CertificationTrack | undefined {
  return loadCertificationTracks().find((track) => track.slug === slug || track.id === slug);
}

export function loadCertificationRuntimeData(): CertificationRuntimeData {
  return cached("certification-runtime-data", () => validateContent(
    z.object({
      program: certificationProgramSchema,
      tracks: certificationTrackSchema.array(),
      lessonsByPath: z.record(z.string(), z.unknown()),
      assessmentsById: z.record(z.string(), z.unknown()),
    }),
    extractJsonConstant<unknown>(readRepositoryFile("site/certification-data.js"), "CERTIFICATIONS"),
    "site/certification-data.js#CERTIFICATIONS",
  ));
}

export function loadCertificationLegacyPage(kind: "catalog" | "track"): CertificationLegacyPage {
  return cached(`certification-legacy-page:${kind}`, () => {
    const sourcePath = kind === "catalog" ? "site/certifications.html" : "site/certification.html";
    const source = readRepositoryFile(sourcePath);
    const main = source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    if (!main) throw new Error(`Legacy certification page is missing its main content: ${sourcePath}`);
    return {
      styles: `${readRepositoryFile("site/style.css")}\n${readRepositoryFile("site/certifications.css")}\n${readRepositoryFile("site/codeology.css")}\n${certificationControlBaseline}`,
      html: rewriteLegacyLinks(main),
      runtime: readRepositoryFile("site/certifications.js"),
      progressRuntime: readRepositoryFile("site/progress.js"),
      certificationProgressRuntime: readRepositoryFile("site/certification-progress.js"),
    };
  });
}

export function loadAssessmentLegacyPage(): AssessmentLegacyPage {
  return cached("assessment-legacy-page", () => {
    const source = readRepositoryFile("site/assessment.html");
    const main = source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    if (!main) throw new Error("Legacy assessment page is missing its main content");
    return {
      styles: `${readRepositoryFile("site/style.css")}\n${readRepositoryFile("site/certifications.css")}\n${certificationControlBaseline}`,
      html: rewriteLegacyLinks(main),
    };
  });
}

export function loadLessonLegacyPage(): LessonLegacyPage {
  return cached("lesson-legacy-page", () => {
    const source = readRepositoryFile("site/lesson.html");
    const routeStyles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
    const bodyStart = source.indexOf('<div class="scroll-progress"');
    const bodyEnd = source.indexOf('<script src="build-meta.js">');
    const inlineScripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    const runtime = inlineScripts.at(-1)?.[1];
    if (!routeStyles || bodyStart < 0 || bodyEnd < 0 || !runtime) {
      throw new Error("Legacy lesson page is missing its route styles, shell, or runtime");
    }
    const html = source.slice(bodyStart, bodyEnd)
      .replace(/<header class="site-header">[\s\S]*?<\/header>/, "")
      .trim();
    return {
      styles: `${readRepositoryFile("site/style.css")}\n${readRepositoryFile("site/certifications.css")}\n${readRepositoryFile("site/codeology.css")}\n${routeStyles}`,
      html: rewriteLegacyLinks(html),
      runtime: runtime.replace(
        "var lessonPath = params.get('path');",
        "var lessonPath = params.get('path') || document.body.getAttribute('data-lesson-path');",
      ),
    };
  });
}

export function loadAssessment(relativePath: string): Assessment {
  return cached(relativePath, () => validateContent(assessmentSchema, readRepositoryJson(relativePath), relativePath));
}

export function loadLessonQuiz(relativePath: string): LessonQuiz {
  return cached(relativePath, () => validateContent(lessonQuizSchema, readRepositoryJson(relativePath), relativePath));
}

export function publicRouteMetadata(input: RouteMetadata): RouteMetadata {
  return validateContent(routeMetadataSchema, input, `route metadata ${input.canonical || "<unknown>"}`);
}

export function loadAcademyProvenance(): SourceProvenance {
  return cached("academy-provenance", () => {
    const source = "site/codeology-config.json";
    const config = validateContent(z.object({ academySource: z.object({
      name: z.string().min(1),
      author: z.string().min(1),
      license: z.string().min(1),
    }) }), readRepositoryJson(source), source);
    return validateContent(sourceProvenanceSchema, {
      classification: "imported",
      sourcePath: "site/data.js",
      attribution: `${config.academySource.name} by ${config.academySource.author}`,
      license: config.academySource.license,
    }, `${source}#academySource`);
  });
}

export function loadAcademyLegacyPage(): AcademyLegacyPage {
  return cached("academy-legacy-page", () => {
    const source = readRepositoryFile("site/index.html");
    const styles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
    const main = source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    if (!styles || !main) throw new Error("Legacy academy page is missing its route styles or main content");

    return {
      styles: `${readRepositoryFile("site/style.css")}\n${readRepositoryFile("site/codeology.css")}\n${styles}`,
      html: rewriteLegacyLinks(main)
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(
          /src="https:\/\/images\.credly\.com\/[^\"]+"/,
          'src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="',
        ),
    };
  });
}

const linkRewrites: Record<string, string> = {
  "index.html": "/",
  "catalog.html": "/catalog",
  "prereqs.html": "/roadmap",
  "glossary.html": "/glossary",
  "about.html": "/about",
  "credits.html": "/credits",
  "assurance.html": "/assurance",
  "certifications.html": "/certifications",
  "cv-analysis.html": "/cv-analysis",
};

function rewriteLegacyLinks(html: string) {
  return Object.entries(linkRewrites).reduce(
    (content, [legacy, current]) => content.replaceAll(`href="${legacy}`, `href="${current}`),
    html,
  );
}

export function loadEditorialPage(slug: EditorialPage["slug"]): EditorialPage {
  const source = readRepositoryFile(`site/${slug}.html`);
  const title = source.match(/<title>(.*?)<\/title>/s)?.[1]?.replace(/ · Codeology$/, "") ?? slug;
  const description = source.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "";
  const main = source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  if (!main) throw new Error(`Legacy page has no main content: ${slug}`);
  const safeMain = slug === "cv-analysis"
    ? main.match(/<header class="cv-analysis-hero">[\s\S]*?<\/header>/)?.[0] ?? main
    : main;
  return {
    slug,
    title,
    description,
    styles: `${readRepositoryFile("site/style.css")}\n${readRepositoryFile("site/codeology.css")}`,
    html: rewriteLegacyLinks(safeMain),
  };
}
