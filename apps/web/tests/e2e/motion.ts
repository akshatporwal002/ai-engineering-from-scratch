import type { Page } from "@playwright/test";

export async function settleFiniteMotion(page: Page) {
  await page.addStyleTag({ content: `
    *, *::before, *::after {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      transition-delay: 0s !important;
      transition-duration: 0s !important;
    }
  ` });
  await page.evaluate(async () => {
    for (let pass = 0; pass < 3; pass += 1) {
      const finiteAnimations = document.getAnimations().filter((animation) => {
        const iterations = animation.effect?.getTiming().iterations;
        return iterations !== Infinity;
      });
      for (const animation of finiteAnimations) {
        try {
          animation.finish();
        } catch {
          await animation.finished.catch(() => undefined);
        }
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!document.getAnimations().some((animation) => animation.effect?.getTiming().iterations !== Infinity)) return;
    }
  });
}
