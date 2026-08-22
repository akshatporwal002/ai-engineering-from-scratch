import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LessonReader } from "../../../components/lesson/lesson-reader";
import { isReferenceLessonSlug, loadReferenceLesson, REFERENCE_LESSON } from "../../../lib/content/lesson-content";

export function generateStaticParams() { return [{ slug: [...REFERENCE_LESSON.routeSlug] }]; }
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  if (!isReferenceLessonSlug((await params).slug)) return {};
  const lesson = loadReferenceLesson();
  return { title: `${lesson.title} · Codeology`, description: lesson.hook, alternates: { canonical: REFERENCE_LESSON.canonical } };
}
export default async function LessonPage({ params }: { params: Promise<{ slug: string[] }> }) {
  if (!isReferenceLessonSlug((await params).slug)) notFound();
  return <LessonReader lesson={loadReferenceLesson()} />;
}
