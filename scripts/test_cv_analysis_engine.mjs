import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const engine = require('../site/cv-analysis-engine.js');

const sample = `
SUMMARY
AI engineer focused on reliable production systems.

EXPERIENCE
Led the design and launch of a retrieval augmented generation API using Python, PyTorch, embeddings, and a vector database.
Reduced response latency by 38% for 12,000 users and saved $45,000 annually through caching and model routing.
Partnered with product and security stakeholders, mentored three engineers, and established evaluation benchmarks.
Deployed services with Docker and Kubernetes on AWS, adding monitoring, observability, guardrails, and prompt injection tests.

SKILLS
Python, PyTorch, RAG, transformers, evaluation, Docker, Kubernetes, AWS, monitoring, privacy, security.

EDUCATION
Bachelor of Engineering.
`;

const first = engine.analyze(sample, 'ai-engineer', 'Build safe RAG systems with evaluation, Kubernetes, and observability.');
const second = engine.analyze(sample, 'ai-engineer', 'Build safe RAG systems with evaluation, Kubernetes, and observability.');

assert.deepEqual(first, second, 'analysis must be deterministic');
assert.equal(first.policy.kind, 'formative-local');
assert.equal(first.policy.persisted, false);
assert.equal(first.policy.transmitted, false);
assert.equal(first.policy.claimsJobReadiness, false);
assert.ok(first.document.wordCount > 80);
assert.ok(first.document.quantifiedStatements >= 3);
assert.ok(first.document.sections.some((section) => section.id === 'experience'));
assert.ok(first.roleAreas.filter((area) => area.status === 'clear').length >= 2);
assert.ok(first.roleAreas.every((area) => area.status !== 'not-found'));
assert.ok(first.signals.find((signal) => signal.id === 'ownership').occurrences >= 2);
assert.ok(!JSON.stringify(first).includes('12,000 users'), 'result must not retain the supplied CV text');
assert.ok(!Object.hasOwn(first, 'score'));
assert.ok(!Object.hasOwn(first, 'readinessScore'));

assert.throws(() => engine.analyze('too short', 'ai-engineer', ''), /at least 120 characters/);
assert.throws(() => engine.analyze('x'.repeat(121), 'unknown-role', ''), /supported target role/);
assert.throws(() => engine.analyze('x'.repeat(engine.LIMITS.maxCharacters + 1), 'ai-engineer', ''), /characters or fewer/);
assert.throws(() => engine.analyze('x'.repeat(121), 'ai-engineer', 'x'.repeat(engine.LIMITS.maxJobCharacters + 1)), /Role context/);

const sparse = engine.analyze(
  'EXPERIENCE\nBuilt internal software and documented team processes. Worked with customers to resolve issues and maintain services over several releases.',
  'agent-engineer',
  'Requires MCP, function calling, sandbox security, checkpoints, tracing, and production queues.'
);
assert.ok(sparse.roleAreas.some((area) => area.roleContextTerms.length > 0));
assert.ok(sparse.editPrompts.some((prompt) => prompt.includes('role context')));

const dataSource = fs.readFileSync(new URL('../site/data.js', import.meta.url), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(`${dataSource}\nglobalThis.__phases = PHASES;`, context);
const lessonNames = new Set(context.__phases.flatMap((phase) => phase.lessons.map((lesson) => lesson.name)));

for (const profile of Object.values(engine.ROLE_PROFILES)) {
  for (const area of profile.areas) {
    for (const query of area.lessonQueries) {
      assert.ok(lessonNames.has(query), `recommended lesson must exist: ${query}`);
    }
  }
}

console.log('CV Analysis engine behavior and curriculum links are valid.');
