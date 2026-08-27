import { expect, test, type Page } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";

const lessonRoute = "/lesson.html?path=phases/01-math-foundations/08-optimization";
const lessonPath = "phases/01-math-foundations/08-optimization";
const directoryFixture = {
  outputs: [{
    name: "prompt-optimizer-guide.md",
    path: `${lessonPath}/outputs/prompt-optimizer-guide.md`,
    size: 3363,
    description: "Guides the user through choosing the right optimizer for their specific machine learning problem",
    html_url: `https://github.com/akshatporwal002/ai-engineering-from-scratch/blob/main/${lessonPath}/outputs/prompt-optimizer-guide.md`,
  }],
  code: [
    { name: "main.jl", path: `${lessonPath}/code/main.jl`, size: 9621, description: "", html_url: `https://github.com/akshatporwal002/ai-engineering-from-scratch/blob/main/${lessonPath}/code/main.jl` },
    { name: "optimizers.py", path: `${lessonPath}/code/optimizers.py`, size: 8922, description: "", html_url: `https://github.com/akshatporwal002/ai-engineering-from-scratch/blob/main/${lessonPath}/code/optimizers.py` },
  ],
};

type LessonVisual = VisualState & {
  position: "top" | "content" | "code" | "mermaid" | "figure" | "quiz" | "completed";
};

const states: LessonVisual[] = [
  // @visual-id visual:reference-lesson:top:light
  { id: "reference-lesson-synchronized-v2", route: lessonRoute, state: "top-light", theme: "light", position: "top" },
  // @visual-id visual:reference-lesson:top:dark
  { id: "reference-lesson-synchronized-v2", route: lessonRoute, state: "top-dark", theme: "dark", position: "top" },
  // @visual-id visual:reference-lesson:content:light
  { id: "reference-lesson-synchronized-v2", route: lessonRoute, state: "content-light", theme: "light", position: "content" },
  // @visual-id visual:reference-lesson:code:light
  { id: "reference-lesson-synchronized-v2", route: lessonRoute, state: "code-light", theme: "light", position: "code" },
  // @visual-id visual:reference-lesson:mermaid:light
  { id: "reference-lesson-synchronized-v2", route: lessonRoute, state: "mermaid-light", theme: "light", position: "mermaid" },
  // @visual-id visual:reference-lesson:figure:light
  { id: "reference-lesson-synchronized-v2", route: lessonRoute, state: "figure-light", theme: "light", position: "figure" },
  // @visual-id visual:reference-lesson:quiz:light
  { id: "reference-lesson-synchronized-v2", route: lessonRoute, state: "quiz-light", theme: "light", position: "quiz" },
  // @visual-id visual:reference-lesson:completed-quiz:light
  { id: "reference-lesson-synchronized-v2", route: lessonRoute, state: "completed-quiz-light", theme: "light", position: "completed" },
];

async function waitForLesson(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "Optimization" })).toBeVisible();
  await expect(page.locator(".quiz-section")).toHaveCount(2);
  await expect(page.locator(".mermaid-render svg")).toHaveCount(5);
  await expect(page.locator('.lesson-figure[data-figure="gradient-descent"] input[type="range"]')).toHaveCount(3);
  await expect(page.locator(".output-card")).toHaveCount(1);
  await expect(page.locator(".code-card")).toHaveCount(2);
}

async function useDirectoryFixture(page: Page) {
  await page.route("https://api.github.com/repos/akshatporwal002/ai-engineering-from-scratch/contents/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const body = requestUrl.pathname.endsWith(`/${lessonPath}/outputs`)
      ? directoryFixture.outputs
      : requestUrl.pathname.endsWith(`/${lessonPath}/code`)
        ? directoryFixture.code
        : undefined;
    if (!body) return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function enterState(page: Page, visual: LessonVisual) {
  if (visual.position === "top") return;
  if (visual.position === "content") {
    await page.getByRole("heading", { name: "Build It", exact: true }).scrollIntoViewIfNeeded();
    return;
  }
  if (visual.position === "code") {
    await page.locator(".lesson-article pre").first().scrollIntoViewIfNeeded();
    return;
  }
  if (visual.position === "mermaid") {
    await page.locator(".mermaid-render").first().scrollIntoViewIfNeeded();
    return;
  }
  if (visual.position === "figure") {
    const figure = page.locator('.lesson-figure[data-figure="gradient-descent"]');
    await figure.locator('input[type="range"]').first().fill("0.42");
    await figure.scrollIntoViewIfNeeded();
    return;
  }
  const quiz = page.locator(".quiz-section").first();
  if (visual.position === "completed") {
    const questions = page.locator(".quiz-section .quiz-question");
    for (const [index, answer] of [0, 1, 3, 1, 1].entries()) {
      await questions.nth(index).locator(".quiz-option").nth(answer).click();
    }
    await expect(page.locator(".quiz-score-result").first()).toContainText("2/2 correct");
    await expect(page.locator(".quiz-score-result").nth(1)).toContainText("3/3 correct");
  }
  await quiz.scrollIntoViewIfNeeded();
}

for (const visual of states) {
  test(`${visual.id} ${visual.state} matches production`, async ({ page }, testInfo) => {
    await useDirectoryFixture(page);
    await prepareVisualPage(page, visual);
    await waitForLesson(page);
    await enterState(page, visual);
    await compareVisualPage(page, testInfo, visual, {
      fullPage: visual.position === "top",
      referenceProjectionCss: visual.theme === "light"
        ? '.lesson-layout { --blueprint: #c43b00 !important; --status-complete: #c43b00 !important; }'
        : undefined,
    });
  });
}
