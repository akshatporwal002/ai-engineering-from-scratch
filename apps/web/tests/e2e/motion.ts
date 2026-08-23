import type { Page } from "@playwright/test";

export async function settleFiniteMotion(page: Page) {
  await page.evaluate(async () => {
    for (let pass = 0; pass < 3; pass += 1) {
      const finiteAnimations = document.getAnimations().filter((animation) => {
        const iterations = animation.effect?.getTiming().iterations;
        return iterations !== Infinity;
      });
      await Promise.all(finiteAnimations.map((animation) => animation.finished.catch(() => undefined)));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!document.getAnimations().some((animation) => animation.effect?.getTiming().iterations !== Infinity)) return;
    }
  });
}
