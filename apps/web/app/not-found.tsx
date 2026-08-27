import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="public-page">
    <section className="public-hero">
      <p className="ui-eyebrow">Not found</p>
      <h1>We could not find that lesson.</h1>
      <p>Browse the complete Codeology curriculum and choose another lesson.</p>
      <Link href="/catalog">Return to the catalog</Link>
    </section>
  </main>;
}
