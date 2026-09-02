import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../../../..");
const readJson = (relative: string) => JSON.parse(readFileSync(path.join(root, relative), "utf8"));

describe("root-hosted Vercel build", () => {
  it("exposes the same Next.js version to framework detection and the web app", () => {
    const rootPackage = readJson("package.json");
    const webPackage = readJson("apps/web/package.json");
    expect(rootPackage.devDependencies.next).toBe(webPackage.dependencies.next);
  });

  it("installs root build tools and app dependencies before building the nested app", () => {
    const config = readJson("vercel.json");
    expect(config.framework).toBe("nextjs");
    expect(config.installCommand).toBe("npm install --package-lock=false && npm --prefix apps/web install --package-lock=false");
    expect(config.buildCommand).toBe("npm run build:web");
    expect(config.outputDirectory).toBe("apps/web/.next");
  });
});
