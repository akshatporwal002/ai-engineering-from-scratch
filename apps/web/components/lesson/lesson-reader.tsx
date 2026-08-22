import type { ReactNode } from "react";

import type { LessonDocument } from "../../lib/content/lesson-content";
import { parseLessonMarkdown } from "../../lib/content/lesson-markdown";
import { CodeBlock } from "./code-block";
import { LegacyFigure } from "./legacy-figure";
import { LessonToc } from "./lesson-toc";
import { MermaidDiagram } from "./mermaid-diagram";
import { QuizPanel } from "./quiz-panel";

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${index}-${part.slice(0, 12)}`;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={key} href={link[2]} target={/^https?:/.test(link[2]) ? "_blank" : undefined} rel={/^https?:/.test(link[2]) ? "noopener" : undefined}>{link[1]}</a>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={key}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function LessonReader({ lesson }: { lesson: LessonDocument }) {
  const blocks = parseLessonMarkdown(lesson.markdown);
  const headings = blocks.filter((block) => block.kind === "heading").map((heading) => ({ id: heading.id, text: heading.text, level: heading.level }));
  return (
    <main id="main-content" className="lesson-page">
      <header className="lesson-hero">
        <p className="ui-eyebrow">Phase 01 · Math foundations · Reference migration</p>
        <h1>{lesson.title}</h1><p>{lesson.hook}</p>
        <dl><div><dt>Type</dt><dd>{lesson.type}</dd></div><div><dt>Language</dt><dd>{lesson.languages}</dd></div><div><dt>Prerequisites</dt><dd>{lesson.prerequisites}</dd></div><div><dt>Time</dt><dd>{lesson.time}</dd></div></dl>
      </header>
      <aside className="lesson-source"><strong>{lesson.provenance.classification} source</strong><p>{lesson.provenance.attribution} · {lesson.provenance.license}. Rendered from <code>{lesson.sourcePath}</code>.</p><a href={lesson.sourceUrl} target="_blank" rel="noopener">Inspect the source lesson <span aria-hidden="true">↗</span></a></aside>
      <div className="lesson-layout">
        <LessonToc headings={headings} />
        <article className="lesson-article">
          {blocks.map((block, index) => {
            const key = `${block.kind}-${index}`;
            if (block.kind === "heading") return block.level === 2 ? <h2 id={block.id} key={key}>{block.text}</h2> : <h3 id={block.id} key={key}>{block.text}</h3>;
            if (block.kind === "paragraph") return <p key={key}>{inline(block.text)}</p>;
            if (block.kind === "blockquote") return <blockquote key={key}><p>{inline(block.text)}</p></blockquote>;
            if (block.kind === "list") {
              const List = block.ordered ? "ol" : "ul";
              return <List key={key}>{block.items.map((item) => <li key={item}>{inline(item)}</li>)}</List>;
            }
            if (block.kind === "table") return <div className="lesson-table" key={key} tabIndex={0}><table><thead><tr>{block.headers.map((header) => <th key={header} scope="col">{inline(header)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={`${rowIndex}-${row[0]}`}>{block.headers.map((_, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{inline(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody></table></div>;
            if (block.kind === "code") return <CodeBlock key={key} language={block.language} source={block.source} />;
            if (block.kind === "mermaid") return <MermaidDiagram key={key} source={block.source} />;
            return <LegacyFigure key={key} name={block.name} />;
          })}
        </article>
      </div>
      <QuizPanel quiz={lesson.quiz} />
      <nav className="lesson-adjacent" aria-label="Adjacent source lessons">
        {lesson.previous && <a href={lesson.previous.url} target="_blank" rel="noopener"><span>Previous source lesson</span><strong>{lesson.previous.name}</strong></a>}
        {lesson.next && <a href={lesson.next.url} target="_blank" rel="noopener"><span>Next source lesson</span><strong>{lesson.next.name}</strong></a>}
      </nav>
    </main>
  );
}
