import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CatalogExplorer } from "../../components/public/catalog-explorer";
import { GlossaryExplorer } from "../../components/public/glossary-explorer";
import {
  loadAssessment,
  loadAcademyProvenance,
  loadCertificationTracks,
  loadEditorialPage,
  loadGlossary,
  loadLessonQuiz,
  loadPhases,
  publicRouteMetadata,
  validateContent,
} from "../../lib/content/public-content";
import { adjacentLessons, resolvePhase, searchGlossary, searchLessons } from "../../lib/content/query";
import { phaseSchema } from "../../lib/content/schemas";

afterEach(cleanup);

describe("public content loaders", () => {
  it("reads curriculum and glossary totals from generated artifacts", () => {
    const phases = loadPhases();
    expect(phases).toHaveLength(20);
    expect(phases.flatMap((phase) => phase.lessons)).toHaveLength(503);
    expect(loadGlossary().length).toBeGreaterThan(200);
  });

  it("reads all source certification tracks", () => {
    expect(loadCertificationTracks().map((track) => track.slug).sort()).toEqual(["ccao-f", "ccar-f", "ccar-p", "ccdv-f"]);
    expect(loadCertificationTracks()).toBe(loadCertificationTracks());
    expect(loadAssessment("certifications/claude/assessments/ccao-f/diagnostic.json").questions.length).toBeGreaterThan(0);
  });

  it("reports the source path and invalid field at runtime boundaries", () => {
    expect(() => validateContent(phaseSchema, { id: -1 }, "fixtures/bad-phase.json"))
      .toThrow(/fixtures\/bad-phase\.json.*id/);
    expect(() => loadLessonQuiz("../package.json")).toThrow(/path escapes repository root/);
  });

  it("validates route metadata and source provenance", () => {
    expect(loadAcademyProvenance()).toMatchObject({ classification: "imported", license: "MIT", sourcePath: "site/data.js" });
    expect(publicRouteMetadata({
      title: "Academy",
      description: "Source-derived curriculum",
      canonical: "/",
      provenance: {
        classification: "adapted",
        sourcePath: "site/data.js",
        attribution: "AI Engineering from Scratch contributors",
        license: "MIT",
      },
    }).provenance?.classification).toBe("adapted");
  });

  it("keeps CV content presentation-only", () => {
    const page = loadEditorialPage("cv-analysis");
    expect(page.html).toContain("Turn your CV into a learning map.");
    expect(page.html).not.toContain("<form");
    expect(page.html).not.toContain("cvAccountWorkspace");
  });

  it("loads the maintained legacy stylesheet with editorial source markup", () => {
    const page = loadEditorialPage("about");
    expect(page.styles).toContain(".about-page");
    expect(page.styles).toContain(".site-header");
    expect(page.html).toContain("Learn the foundations.");
  });
});

describe("public search and filters", () => {
  it("keeps curriculum order while offering deterministic name sorting and navigation", () => {
    const phases = loadPhases();
    expect(searchLessons(phases).slice(0, 3).map((lesson) => lesson.name)).toEqual(["Dev Environment", "Git & Collaboration", "GPU Setup & Cloud"]);
    const sorted = searchLessons(phases, { phaseId: "0", sort: "name" }).map((lesson) => lesson.name);
    expect(sorted).toEqual([...sorted].sort((left, right) => left.toLocaleLowerCase("en-US").localeCompare(right.toLocaleLowerCase("en-US"))));
    const adjacent = adjacentLessons(phases, "git-collaboration");
    expect(adjacent.previous?.name).toBe("Dev Environment");
    expect(adjacent.current?.name).toBe("Git & Collaboration");
    expect(adjacent.next?.name).toBe("GPU Setup & Cloud");
    expect(resolvePhase(phases, "math-foundations")?.id).toBe(1);
  });

  it("sorts glossary searches deterministically without mutating source data", () => {
    const entries = loadGlossary();
    const originalFirst = entries[0];
    const results = searchGlossary(entries, { query: "model" });
    expect(results.length).toBeGreaterThan(1);
    expect(entries[0]).toBe(originalFirst);
    expect(results.map((entry) => entry.term)).toEqual([...results].map((entry) => entry.term).sort((left, right) => left.toLocaleLowerCase("en-US").localeCompare(right.toLocaleLowerCase("en-US"))));
  });

  it("filters catalog lessons by query and phase", () => {
    render(<CatalogExplorer phases={loadPhases()} />);
    expect(screen.getByRole("status").textContent).toBe("503 of 503 lessons");
    fireEvent.change(screen.getByLabelText("Search lessons"), { target: { value: "Dev Environment" } });
    expect(screen.getByRole("status").textContent).toBe("1 of 503 lessons");
    expect(screen.getByRole("heading", { name: "Dev Environment" })).toBeTruthy();
  });

  it("filters glossary terms without changing the source entries", () => {
    const entries = loadGlossary();
    render(<GlossaryExplorer entries={entries} />);
    fireEvent.change(screen.getByLabelText("Search the ledger"), { target: { value: "training-memory technique" } });
    expect(screen.getByRole("heading", { name: "Activation Checkpointing" })).toBeTruthy();
    expect(document.getElementById("glossaryCount")?.textContent).toBe(`1 of ${entries.length} terms`);
  });
});
