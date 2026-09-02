export type LessonBlock =
  | { kind: "heading"; level: 2 | 3; text: string; id: string }
  | { kind: "paragraph"; text: string }
  | { kind: "blockquote"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "code"; language: string; source: string }
  | { kind: "mermaid"; source: string }
  | { kind: "figure"; name: string };

export function lessonSlug(text: string) {
  return text.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function splitTableRow(line: string) {
  const cells: string[] = [];
  let current = "";
  let inlineCode = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\\" && line[index + 1] === "|") {
      current += "|";
      index += 1;
    } else if (character === "`") {
      inlineCode = !inlineCode;
      current += character;
    } else if (character === "|" && !inlineCode) {
      cells.push(current.trim());
      current = "";
    } else current += character;
  }
  cells.push(current.trim());
  if (!cells[0]) cells.shift();
  if (!cells.at(-1)) cells.pop();
  return cells;
}

function isBlockStart(line: string) {
  return /^#{1,3}\s|^>\s|^```|^[-*]\s|^\d+\.\s|^\|.*\|\s*$/.test(line);
}

export function parseLessonMarkdown(markdown: string): LessonBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: LessonBlock[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim() || /^#\s/.test(line) || /^\*\*[^*]+:\*\*/.test(line)) {
      index += 1;
      continue;
    }
    if (/^>\s/.test(line)) {
      const text = line.replace(/^>\s?/, "");
      if (!blocks.length) { index += 1; continue; }
      blocks.push({ kind: "blockquote", text });
      index += 1;
      continue;
    }
    const heading = line.match(/^(##|###)\s+(.+)$/);
    if (heading) {
      const text = heading[2].trim();
      blocks.push({ kind: "heading", level: heading[1].length as 2 | 3, text, id: lessonSlug(text) });
      index += 1;
      continue;
    }
    const fence = line.match(/^```([^\s`]*)\s*$/);
    if (fence) {
      const language = fence[1] || "text";
      const source: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) source.push(lines[index++]);
      if (index >= lines.length) throw new Error(`Unterminated ${language} fence at line ${index + 1}`);
      index += 1;
      if (language === "mermaid") blocks.push({ kind: "mermaid", source: source.join("\n") });
      else if (language === "figure") blocks.push({ kind: "figure", name: source.join("\n").trim() });
      else blocks.push({ kind: "code", language, source: source.join("\n") });
      continue;
    }
    if (/^\|.*\|\s*$/.test(line) && index + 1 < lines.length && /^\|?\s*:?-+/.test(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && /^\|.*\|\s*$/.test(lines[index])) rows.push(splitTableRow(lines[index++]));
      blocks.push({ kind: "table", headers, rows });
      continue;
    }
    const list = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (list) {
      const ordered = list[1].endsWith(".");
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }
    if (/^---+$/.test(line)) {
      index += 1;
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index]) && !/^---+$/.test(lines[index])) paragraph.push(lines[index++].trim());
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }
  return blocks;
}
