import { expect, test } from "@playwright/test";
import { compareVisualPage, prepareVisualPage, type VisualState } from "./parity";

const states: VisualState[] = [
  // @visual-id visual:certifications:catalog-synchronized-v2:light
  { id: "certifications-synchronized-v2", route: "/certifications.html", state: "catalog-light", theme: "light" },
  // @visual-id visual:certifications:catalog-synchronized-v2:dark
  { id: "certifications-synchronized-v2", route: "/certifications.html", state: "catalog-dark", theme: "dark" },
];

for (const visual of states) {
  test(`${visual.id} ${visual.state} matches production`, async ({ page }, testInfo) => {
    await prepareVisualPage(page, visual);
    await expect(page.locator(".cert-track-card").first()).toBeVisible();
    await page.locator(".cert-track-badge").evaluateAll((images) => images.forEach((image) => {
      (image as HTMLImageElement).src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    }));
    await compareVisualPage(page, testInfo, visual);
  });
}
