import type { EditorialPage as EditorialPageModel } from "../../lib/content/public-content";

export function EditorialPage({ page }: { page: EditorialPageModel }) {
  return (
    <main id="main-content" className={`public-page public-page--${page.slug}`}>
      <div className="legacy-content" dangerouslySetInnerHTML={{ __html: page.html }} />
      {page.slug === "cv-analysis" && (
        <aside className="public-boundary" aria-label="Overnight experiment boundary">
          <strong>Presentation-only local preview</strong>
          <p>This experiment does not accept CVs, create accounts, store personal data, or contact an AI provider. Product forms arrive only with the later mock-product workstream.</p>
        </aside>
      )}
    </main>
  );
}
