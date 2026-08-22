import { z } from "zod";

const nonEmpty = z.string().min(1);
const repositoryPath = nonEmpty.refine((value) => !value.startsWith("/") && !value.includes(".."), "must be a repository-relative path");

export const lessonSummarySchema = z.object({
  name: nonEmpty,
  status: nonEmpty,
  type: nonEmpty,
  lang: z.string(),
  url: nonEmpty,
  summary: z.string().optional(),
});

export const phaseSchema = z.object({
  id: z.number().int().nonnegative(),
  name: nonEmpty,
  status: nonEmpty,
  desc: z.string(),
  lessons: z.array(lessonSummarySchema),
});

export const glossaryEntrySchema = z.object({
  term: nonEmpty,
  slug: nonEmpty,
  letter: nonEmpty,
  category: nonEmpty,
  says: z.string(),
  means: nonEmpty,
  whyItMatters: z.string(),
  example: z.string(),
  confusion: z.string(),
  related: z.array(z.string()),
  aliases: z.array(z.string()),
});

export const certificationProgramSchema = z.object({
  id: nonEmpty,
  name: nonEmpty,
  provider: nonEmpty,
  publisher: nonEmpty,
  version: nonEmpty,
  lastVerified: nonEmpty,
  guideVersion: nonEmpty,
  guideEffective: nonEmpty,
  summary: nonEmpty,
  promise: nonEmpty,
  accessNotice: nonEmpty,
  disclaimer: nonEmpty,
  scoringNotice: nonEmpty,
  sourcePolicy: nonEmpty,
  prerequisitesPath: repositoryPath,
  officialLinks: z.array(z.object({ label: nonEmpty, url: z.url() })),
  tracks: z.array(nonEmpty),
});

const certificationExamSchema = z.object({
  items: z.number().int().positive(),
  timeLimitMinutes: z.number().int().positive(),
  feeUsd: z.number().nonnegative(),
  passingScaledScore: z.number().int().optional(),
  scoreScale: z.string().optional(),
  validityMonths: z.number().int().positive().optional(),
  format: nonEmpty,
  delivery: nonEmpty,
  guideVersion: z.string().optional(),
  effective: z.string().optional(),
  officialGuideUrl: z.url().optional(),
});

export const assessmentReferenceSchema = z.object({
  id: nonEmpty,
  path: repositoryPath,
  kind: z.enum(["diagnostic", "mock"]),
  title: nonEmpty,
  timeLimitMinutes: z.number().int().positive(),
});

export const certificationTrackSchema = z.object({
  id: nonEmpty,
  slug: nonEmpty,
  examCode: nonEmpty,
  credential: nonEmpty,
  shortName: nonEmpty,
  level: nonEmpty,
  accent: z.string().optional(),
  badge: z.object({ imageUrl: z.url(), width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
  summary: nonEmpty,
  audience: nonEmpty,
  recommendedExperience: z.array(nonEmpty),
  exam: certificationExamSchema,
  domains: z.array(z.object({
    id: nonEmpty,
    name: nonEmpty,
    weight: z.number().positive(),
    objectives: z.array(nonEmpty).min(1),
  })).min(1),
  lessons: z.array(z.object({
    path: repositoryPath,
    domains: z.array(nonEmpty),
    role: nonEmpty,
    required: z.boolean(),
  })),
  deepDives: z.array(z.object({ path: repositoryPath, label: nonEmpty, reason: nonEmpty })).optional(),
  assessments: z.array(assessmentReferenceSchema).optional(),
  studyPlans: z.array(z.object({
    id: nonEmpty,
    label: nonEmpty,
    durationDays: z.number().int().positive(),
    hoursPerWeek: z.number().positive(),
    milestones: z.array(nonEmpty).min(1),
  })),
});

export const assessmentQuestionSchema = z.object({
  id: nonEmpty,
  domain: nonEmpty,
  objective: nonEmpty,
  type: z.enum(["single", "multiple"]),
  prompt: nonEmpty,
  options: z.array(nonEmpty).min(2),
  correct: z.array(z.number().int().nonnegative()).min(1),
  explanation: nonEmpty,
  references: z.array(nonEmpty).min(1),
}).superRefine((question, context) => {
  if (question.type === "single" && question.correct.length !== 1) {
    context.addIssue({ code: "custom", path: ["correct"], message: "single questions require exactly one correct index" });
  }
  if (question.type === "multiple" && question.correct.length < 2) {
    context.addIssue({ code: "custom", path: ["correct"], message: "multiple questions require at least two correct indices" });
  }
  for (const index of question.correct) {
    if (index >= question.options.length) context.addIssue({ code: "custom", path: ["correct"], message: `index ${index} is outside options` });
  }
});

export const assessmentSchema = z.object({
  id: nonEmpty,
  version: z.number().int().positive(),
  track: nonEmpty,
  kind: z.enum(["diagnostic", "mock"]),
  title: nonEmpty,
  timeLimitMinutes: z.number().int().positive(),
  questions: z.array(assessmentQuestionSchema).min(1),
});

export const quizQuestionSchema = z.object({
  stage: z.enum(["pre", "check", "post"]),
  question: nonEmpty,
  options: z.array(nonEmpty).min(2),
  correct: z.number().int().nonnegative(),
  explanation: z.string(),
}).refine((question) => question.correct < question.options.length, { path: ["correct"], message: "index is outside options" });

export const lessonQuizSchema = z.object({
  lesson: z.string().optional(),
  title: z.string().optional(),
  questions: z.array(quizQuestionSchema).min(1),
});

export const sourceProvenanceSchema = z.object({
  classification: z.enum(["imported", "adapted", "original"]),
  sourcePath: repositoryPath,
  attribution: nonEmpty,
  license: nonEmpty.optional(),
});

export const routeMetadataSchema = z.object({
  title: nonEmpty,
  description: nonEmpty,
  canonical: nonEmpty,
  provenance: sourceProvenanceSchema.optional(),
});

export type LessonSummary = z.infer<typeof lessonSummarySchema>;
export type PhaseSummary = z.infer<typeof phaseSchema>;
export type GlossaryEntry = z.infer<typeof glossaryEntrySchema>;
export type CertificationProgram = z.infer<typeof certificationProgramSchema>;
export type CertificationTrack = z.infer<typeof certificationTrackSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;
export type LessonQuiz = z.infer<typeof lessonQuizSchema>;
export type SourceProvenance = z.infer<typeof sourceProvenanceSchema>;
export type RouteMetadata = z.infer<typeof routeMetadataSchema>;
