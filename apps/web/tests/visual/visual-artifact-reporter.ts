import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export default class VisualArtifactReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    const destinations = test.annotations
      .filter((annotation) => annotation.type === "visual-artifact" && annotation.description)
      .map((annotation) => JSON.parse(annotation.description!) as { diff: string });
    const diffs = result.attachments.filter((attachment) => attachment.path?.endsWith("-diff.png"));
    for (let index = 0; index < Math.min(destinations.length, diffs.length); index += 1) {
      const source = diffs[index].path;
      if (!source) continue;
      mkdirSync(path.dirname(destinations[index].diff), { recursive: true });
      copyFileSync(source, destinations[index].diff);
    }
  }
}
