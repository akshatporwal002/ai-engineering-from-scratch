import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegacyLessonRuntime } from "../../../components/lesson/legacy-lesson-runtime";
import { loadCurriculumLesson, loadCurriculumLessons } from "../../../lib/content/lesson-content";
import { loadLessonLegacyPage } from "../../../lib/content/public-content";

export const dynamicParams = true;
export function generateStaticParams() { return loadCurriculumLessons().map((lesson) => ({ slug: lesson.routeSlug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const lesson = loadCurriculumLesson((await params).slug);
  if (!lesson) return {};
  return { title: `${lesson.title} · Codeology`, description: lesson.hook, alternates: { canonical: `/lessons/${lesson.routeSlug.join("/")}` } };
}
export default async function LessonPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const lesson = loadCurriculumLesson((await params).slug);
  if (!lesson) notFound();
  const legacy = loadLessonLegacyPage();
  return <>
    <style data-legacy-route="lesson" dangerouslySetInnerHTML={{ __html: legacy.styles }} />
    <div dangerouslySetInnerHTML={{ __html: legacy.html }} />
    <LegacyLessonRuntime
      lessonPath={lesson.sourcePath.replace(/\/docs\/en\.md$/, "")}
      markdown={lesson.markdown}
      quiz={lesson.quiz}
      directoryFiles={lesson.directoryFiles}
      runtime={legacy.runtime}
    />
  </>;
}
