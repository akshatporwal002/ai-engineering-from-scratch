import type { Metadata } from "next";
import { EditorialPage } from "../../components/public/editorial-page";
import { loadEditorialPage } from "../../lib/content/public-content";

const page = loadEditorialPage("cv-analysis");
export const metadata: Metadata = { title: page.title, description: page.description, alternates: { canonical: "/cv-analysis" } };
export default function CvAnalysisPage() { return <EditorialPage page={page} />; }
