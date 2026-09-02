"use client";

function labelsFrom(source: string) {
  const labels: string[] = [];
  for (const match of source.matchAll(/\["([^"\]]+)"\]/g)) if (!labels.includes(match[1])) labels.push(match[1]);
  return labels;
}

export function MermaidDiagram({ source }: { source: string }) {
  const labels = labelsFrom(source);
  const available = /^\s*graph\s+(TD|LR|TB|RL)\b/m.test(source) && labels.length > 0;
  return (
    <figure className="lesson-mermaid">
      <figcaption>Mermaid concept map</figcaption>
      {available ? (
        <div role="img" aria-label={`Diagram flow: ${labels.join("; then ")}`}>
          <ol className="lesson-mermaid__flow">
            {labels.map((label) => <li key={label}>{label}</li>)}
          </ol>
        </div>
      ) : <p role="status">Diagram rendering is unavailable. The complete Mermaid source remains below.</p>}
      <details><summary>Mermaid source and accessible fallback</summary><pre><code>{source}</code></pre></details>
    </figure>
  );
}
