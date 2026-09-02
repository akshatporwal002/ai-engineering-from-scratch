"use client";

import { useState } from "react";

const keywords = new Set("and as assert async await break catch class const continue def else elif except export false finally fn for from function if impl import in is lambda let match mut new none null or pass pub raise return self struct this throw true try use var while with yield".split(" "));

function highlighted(source: string) {
  return source.split(/(#[^\n]*|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g).map((token, index) => {
    let className: string | undefined;
    if (/^(#|\/\/)/.test(token)) className = "syntax-comment";
    else if (/^["']/.test(token)) className = "syntax-string";
    else if (/^\d/.test(token)) className = "syntax-number";
    else if (keywords.has(token.toLocaleLowerCase("en-US"))) className = "syntax-keyword";
    return <span className={className} key={`${index}-${token.slice(0, 8)}`}>{token}</span>;
  });
}

export function CodeBlock({ language, source }: { language: string; source: string }) {
  const [status, setStatus] = useState("Copy");
  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setStatus("Copied");
    } catch {
      setStatus("Copy unavailable");
    }
    window.setTimeout(() => setStatus("Copy"), 1600);
  }
  return (
    <div className="lesson-code">
      <div><span>{language}</span><button type="button" onClick={copy} aria-label={`Copy ${language} code`}>{status}</button></div>
      <pre tabIndex={0}><code>{highlighted(source)}</code></pre>
    </div>
  );
}
