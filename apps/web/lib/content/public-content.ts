import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(process.cwd(), "../..");

export type LessonSummary = {
  name: string;
  status: string;
  type: string;
  lang: string;
  url: string;
  summary?: string;
};

export type PhaseSummary = {
  id: number;
  name: string;
  status: string;
  desc: string;
  lessons: LessonSummary[];
};

export type GlossaryEntry = {
  term: string;
  slug: string;
  letter: string;
  category: string;
  says: string;
  means: string;
  whyItMatters: string;
  example: string;
  confusion: string;
  related: string[];
  aliases: string[];
};

export type CertificationProgram = {
  id: string;
  name: string;
  provider: string;
  publisher: string;
  summary: string;
  promise: string;
  accessNotice: string;
  disclaimer: string;
  scoringNotice: string;
  tracks: string[];
};

export type CertificationTrack = {
  id: string;
  slug: string;
  examCode: string;
  credential: string;
  shortName: string;
  level: string;
  summary: string;
  audience: string;
  recommendedExperience: string[];
  exam: { items: number; timeLimitMinutes: number; feeUsd: number; format: string; delivery: string };
  domains: { id: string; name: string; weight: number; objectives: string[] }[];
  lessons: { path: string; domains: string[]; role: string; required: boolean }[];
  studyPlans: { id: string; label: string; durationDays: number; hoursPerWeek: number; milestones: string[] }[];
};

export type EditorialPage = {
  slug: "about" | "credits" | "assurance" | "cv-analysis";
  title: string;
  description: string;
  html: string;
};

function readRepositoryFile(relativePath: string) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8");
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
  return extractJsonConstant<PhaseSummary[]>(generatedData(), "PHASES");
}

export function loadRoadmapPrerequisites(): Record<string, number[]> {
  return extractJsonConstant<Record<string, number[]>>(generatedData(), "ROADMAP_PREREQS");
}

export function loadGlossary(): GlossaryEntry[] {
  return extractJsonConstant<GlossaryEntry[]>(generatedData(), "GLOSSARY");
}

export function loadCertificationProgram(): CertificationProgram {
  return JSON.parse(readRepositoryFile("certifications/claude/program.json")) as CertificationProgram;
}

export function loadCertificationTracks(): CertificationTrack[] {
  return readdirSync(path.join(repositoryRoot, "certifications/claude/tracks"))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readRepositoryFile(`certifications/claude/tracks/${name}`)) as CertificationTrack);
}

export function loadCertificationTrack(slug: string): CertificationTrack | undefined {
  return loadCertificationTracks().find((track) => track.slug === slug || track.id === slug);
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
  return { slug, title, description, html: rewriteLegacyLinks(safeMain) };
}
