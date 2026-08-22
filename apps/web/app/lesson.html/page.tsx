import { redirect } from "next/navigation";
import { REFERENCE_LESSON } from "../../lib/content/lesson-content";

export default async function LegacyLessonPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const sourcePath = (await searchParams).path?.replace(/^\//, "").replace(/\/$/, "");
  if (sourcePath === REFERENCE_LESSON.repositoryPath) redirect(REFERENCE_LESSON.canonical);
  redirect("/catalog");
}
