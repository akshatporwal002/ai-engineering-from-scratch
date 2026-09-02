import { redirect } from "next/navigation";
import { loadCurriculumLessons } from "../../lib/content/lesson-content";

export default async function LegacyLessonPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const sourcePath = (await searchParams).path?.replace(/^\//, "").replace(/\/$/, "");
  const lesson = loadCurriculumLessons().find((item) => item.sourcePath === `${sourcePath}/docs/en.md`);
  if (lesson) redirect(`/lessons/${lesson.routeSlug.join("/")}`);
  redirect("/catalog");
}
