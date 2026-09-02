import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { LessonProgress } from "../../lib/api/generated";
import { mergeLesson } from "../../lib/progress/merge";

const fixture = JSON.parse(readFileSync(path.resolve(process.cwd(), "../api/fixtures/progress-merge.json"), "utf8")) as { cases: { name: string; local: LessonProgress; remote: LessonProgress; expected: LessonProgress }[] };

describe("language-neutral progress merge contract", () => {
  for (const item of fixture.cases) it(item.name, () => expect(mergeLesson(item.local, item.remote)).toEqual(item.expected));
});
