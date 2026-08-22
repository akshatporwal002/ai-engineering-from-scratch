import { loadPhases } from "../lib/content/public-content";

export default function HomePage() {
  const phases = loadPhases();
  const lessons = phases.reduce((count, phase) => count + phase.lessons.length, 0);
  return (
    <main id="main-content" className="academy-page">
      <section className="academy-hero">
        <div>
          <p className="ui-eyebrow">Codeology · open-tool engineering</p>
          <h1>Learn freely.<br />Build for real.</h1>
          <p>Study excellent foundations, then apply them in realistic software engineering work completed in your own editor and repository.</p>
          <div className="academy-actions"><a href="/catalog">Explore the free academy</a><a href="/assurance">See how evidence works</a></div>
        </div>
        <aside aria-label="Academy summary"><strong>{lessons}</strong><span>lessons</span><strong>{phases.length}</strong><span>phases</span></aside>
      </section>
      <section className="academy-principles" aria-label="How the academy works">
        <article><span>01 · Learn</span><h2>Free foundations</h2><p>Read deeply, build from first principles, and keep the imported academy open to everyone.</p></article>
        <article><span>02 · Build</span><h2>Your environment</h2><p>Complete realistic work in your own editor, repository, compute, and AI workflow.</p></article>
        <article><span>03 · Prove</span><h2>Inspectable evidence</h2><p>Bind review to an immutable commit and show exactly what supports each skill claim.</p></article>
      </section>
      <section id="contents" className="academy-phases" aria-labelledby="phase-title">
        <p className="ui-eyebrow">AI Engineering Foundations · {phases.length} phases · {lessons} lessons</p>
        <h2 id="phase-title">Build every layer from scratch</h2>
        <div>{phases.map((phase) => <a key={phase.id} href={`/roadmap#phase-${phase.id}`}><span>{String(phase.id).padStart(2, "0")}</span><strong>{phase.name}</strong><small>{phase.lessons.length} lessons</small></a>)}</div>
      </section>
      <aside className="source-attribution"><strong>Imported academy</strong><p>Curriculum content derives from AI Engineering from Scratch by Rohit Ghumare and contributors under the MIT licence. Codeology is an independent adaptation.</p><a href="/credits">Credits and immutable provenance</a></aside>
    </main>
  );
}
