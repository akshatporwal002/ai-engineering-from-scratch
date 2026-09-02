import { test } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";

const states: VisualState[] = [
  // @visual-id visual:editorial:about:light
  { id: "about", route: "/about.html", state: "light", theme: "light" },
  // @visual-id visual:editorial:about:dark
  { id: "about", route: "/about.html", state: "dark", theme: "dark" },
  // @visual-id visual:editorial:credits:light
  { id: "credits", route: "/credits.html", state: "light", theme: "light" },
  // @visual-id visual:editorial:credits:dark
  { id: "credits", route: "/credits.html", state: "dark", theme: "dark" },
];

for (const visual of states) {
  test(`${visual.id} ${visual.state} matches production`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    await compareVisualPage(page, testInfo, visual);
  });
}
