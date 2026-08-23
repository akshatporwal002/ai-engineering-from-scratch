import { AcademyExperience } from "../components/public/academy-experience";
import { loadAcademyLegacyPage, loadGlossary, loadPhases } from "../lib/content/public-content";

export default function HomePage() {
  const phases = loadPhases();
  const legacy = loadAcademyLegacyPage();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: legacy.styles }} />
      <AcademyExperience html={legacy.html} phases={phases} glossaryCount={loadGlossary().length} />
    </>
  );
}
