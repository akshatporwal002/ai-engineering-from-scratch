import type { Metadata } from "next";
import { ProductWorkspace } from "../../components/product/product-workspace";
import { loadEditorialPage } from "../../lib/content/public-content";

export const metadata: Metadata = { title: "CV Analysis · Codeology", description: "Save, analyze, improve and export your CV through your Codeology account.", alternates: { canonical: "/cv-analysis" } };
export default function CvAnalysisPage() {
  // The in-memory workflow is an explicit test harness only. A local dev
  // server must not accidentally present fixture accounts as product behavior.
  if (process.env.CODEOLOGY_ENABLE_FIXTURES === "1") return <ProductWorkspace enabled />;
  const legacy = loadEditorialPage("cv-analysis");
  return <>
    <style data-legacy-route="cv-analysis" dangerouslySetInnerHTML={{ __html: legacy.styles }} />
    <main id="main-content" className="cv-analysis-page" dangerouslySetInnerHTML={{ __html: legacy.html }} />
  </>;
}
