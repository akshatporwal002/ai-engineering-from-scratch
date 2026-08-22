import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CatalogExplorer } from "../../components/public/catalog-explorer";
import { GlossaryExplorer } from "../../components/public/glossary-explorer";
import {
  loadCertificationTracks,
  loadEditorialPage,
  loadGlossary,
  loadPhases,
} from "../../lib/content/public-content";

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
  });

  it("keeps CV content presentation-only", () => {
    const page = loadEditorialPage("cv-analysis");
    expect(page.html).toContain("Turn your CV into a learning map.");
    expect(page.html).not.toContain("<form");
    expect(page.html).not.toContain("cvAccountWorkspace");
  });
});

describe("public search and filters", () => {
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
    fireEvent.change(screen.getByLabelText("Search the glossary"), { target: { value: "training-memory technique" } });
    expect(screen.getByRole("heading", { name: "Activation Checkpointing" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(`1 of ${entries.length} terms`);
  });
});
