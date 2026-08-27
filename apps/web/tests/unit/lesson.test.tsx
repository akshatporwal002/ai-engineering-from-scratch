import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MermaidDiagram } from "../../components/lesson/mermaid-diagram";
import { QuizPanel } from "../../components/lesson/quiz-panel";
import { loadCurriculumLesson, loadCurriculumLessons, loadReferenceLesson, REFERENCE_LESSON } from "../../lib/content/lesson-content";
import { internalLessonUrl } from "../../lib/content/query";
import { parseLessonMarkdown } from "../../lib/content/lesson-markdown";
import { lessonQuizSchema } from "../../lib/content/schemas";
import { validateContent } from "../../lib/content/public-content";

afterEach(cleanup);

describe("reference lesson source", () => {
  it("discovers every authoritative curriculum lesson and resolves its internal route", () => {
    const lessons = loadCurriculumLessons();
    expect(lessons.length).toBeGreaterThan(400);
    expect(new Set(lessons.map((lesson) => lesson.sourcePath)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      expect(loadCurriculumLesson(lesson.routeSlug)?.sourcePath).toBe(lesson.sourcePath);
      expect(internalLessonUrl(lesson.sourceUrl)).toBe(`/lessons/${lesson.routeSlug.join("/")}`);
    }
  });

  it("loads the preferred optimization lesson and preserves its contracts", () => {
    const lesson = loadReferenceLesson();
    expect(lesson.title).toBe("Optimization");
    expect(lesson.sourcePath).toBe(`${REFERENCE_LESSON.repositoryPath}/docs/en.md`);
    expect(lesson.provenance).toMatchObject({ classification: "imported", license: "MIT" });
    expect(lesson.quiz.questions).toHaveLength(5);
    expect(lesson.previous?.name).toBe("Bayes' Theorem & Statistical Thinking");
    expect(lesson.next?.name).toBe("Information Theory: Entropy, KL Divergence");
  });

  it("parses headings, code, Mermaid, tables, and the compatibility figure", () => {
    const blocks = parseLessonMarkdown(loadReferenceLesson().markdown);
    expect(blocks.some((block) => block.kind === "heading" && block.text === "Build It")).toBe(true);
    expect(blocks.some((block) => block.kind === "code" && block.language === "python")).toBe(true);
    expect(blocks.filter((block) => block.kind === "mermaid").length).toBeGreaterThan(3);
    expect(blocks.some((block) => block.kind === "figure" && block.name === "gradient-descent")).toBe(true);
    expect(blocks.some((block) => block.kind === "table" && block.headers.includes("Schedule"))).toBe(true);
  });

  it("rejects malformed quiz indexes with an exact field path", () => {
    expect(() => validateContent(lessonQuizSchema, { questions: [{ stage: "pre", question: "Broken", options: ["A", "B"], correct: 3, explanation: "" }] }, "fixture/quiz.json"))
      .toThrow(/fixture\/quiz\.json.*questions\.0\.correct/);
  });
});

describe("reference lesson error and practice states", () => {
  it("keeps Mermaid source available when rendering is unavailable", () => {
    render(<MermaidDiagram source="not a graph" />);
    expect(screen.getByRole("status").textContent).toContain("unavailable");
    expect(screen.getByText("Mermaid source and accessible fallback")).toBeTruthy();
  });

  it("renders a quiz-data error without crashing the lesson", () => {
    render(<QuizPanel error="questions.0.correct is outside options" />);
    expect(screen.getByRole("heading", { name: "Quiz unavailable" })).toBeTruthy();
    expect(screen.getByText(/questions\.0\.correct/)).toBeTruthy();
  });

  it("scores answers in local component memory and can reset", () => {
    const quiz = loadReferenceLesson().quiz;
    render(<QuizPanel quiz={quiz} />);
    quiz.questions.forEach((question) => fireEvent.click(screen.getByLabelText(question.options[question.correct])));
    fireEvent.click(screen.getByRole("button", { name: "Check answers" }));
    expect(screen.getByRole("status").textContent).toBe("5 of 5 correct");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("status").textContent).toBe("0 of 5 answered");
  });
});
