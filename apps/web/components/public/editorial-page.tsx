import type { EditorialPage as EditorialPageModel } from "../../lib/content/public-content";

export function EditorialPage({ page }: { page: EditorialPageModel }) {
  if (page.slug !== "cv-analysis") {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: page.styles }} />
        <main id="main-content" className={`${page.slug}-page`} dangerouslySetInnerHTML={{ __html: page.html }} />
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: page.styles }} />
      <main id="main-content" className={`${page.slug}-page`}>
        <div className="editorial-source" dangerouslySetInnerHTML={{ __html: page.html }} />
        <aside className="public-boundary" aria-label="Overnight experiment boundary">
          <strong>Presentation-only local preview</strong>
          <p>This experiment does not accept CVs, create accounts, store personal data, or contact an AI provider. Product forms arrive only with the later mock-product workstream.</p>
        </aside>
      </main>
    </>
  );
}
