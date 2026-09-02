import type { Metadata } from "next";
import { ProductWorkspace } from "../../components/product/product-workspace";

export const metadata: Metadata = { title: "CV Analysis · Codeology", description: "Save, analyze, improve and export your CV through your Codeology account.", alternates: { canonical: "/cv-analysis" } };
export default function CvAnalysisPage() {
  // The in-memory workflow is an explicit test harness only. A local dev
  // server must not accidentally present fixture accounts as product behavior.
  const fixture = process.env.CODEOLOGY_ENABLE_FIXTURES === "1";
  if (fixture && process.env.VERCEL_ENV === "production") throw new Error("CV fixtures cannot be enabled in production.");
  return <ProductWorkspace enabled fixture={fixture} />;
}
