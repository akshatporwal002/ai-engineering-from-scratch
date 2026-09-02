"use client";

import { useEffect, useState } from "react";
import type { LessonQuiz } from "../../lib/content/public-content";

export function QuizPanel({ quiz, error }: { quiz?: LessonQuiz; error?: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!quiz || error) return <section className="lesson-render-error" aria-labelledby="quiz-error"><h2 id="quiz-error">Quiz unavailable</h2><p>{error ?? "The quiz data could not be loaded."}</p></section>;
  const score = quiz.questions.reduce((total, question, index) => total + (answers[index] === question.correct ? 1 : 0), 0);
  return (
    <section className="lesson-quiz" aria-labelledby="quiz-title" data-hydrated={hydrated}>
      <p className="ui-eyebrow">Local practice</p><h2 id="quiz-title">Check your understanding</h2>
      <p>Answers stay in this browser tab and are discarded when the page closes.</p>
      {quiz.questions.map((question, questionIndex) => (
        <fieldset key={question.question}>
          <legend><span>{String(questionIndex + 1).padStart(2, "0")}</span>{question.question}</legend>
          {question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => { setAnswers((current) => ({ ...current, [questionIndex]: optionIndex })); setSubmitted(false); }} />{option}</label>)}
          {submitted && <p className={answers[questionIndex] === question.correct ? "quiz-correct" : "quiz-incorrect"}><strong>{answers[questionIndex] === question.correct ? "Correct." : `Answer: ${question.options[question.correct]}.`}</strong> {question.explanation}</p>}
        </fieldset>
      ))}
      <div className="lesson-quiz__actions"><button type="button" onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== quiz.questions.length}>Check answers</button><button type="button" onClick={() => { setAnswers({}); setSubmitted(false); }}>Reset</button></div>
      <p role="status" aria-live="polite">{submitted ? `${score} of ${quiz.questions.length} correct` : `${Object.keys(answers).length} of ${quiz.questions.length} answered`}</p>
    </section>
  );
}
