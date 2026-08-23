import { test } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";

const states: VisualState[] = [
  // @visual-id visual:academy:light
  { id: "academy", route: "/", state: "light", theme: "light" },
  // @visual-id visual:academy:dark
  { id: "academy", route: "/", state: "dark", theme: "dark" },
];

for (const visual of states) {
  test(`${visual.id} ${visual.state} matches production`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    await compareVisualPage(page, testInfo, visual);
  });
}
