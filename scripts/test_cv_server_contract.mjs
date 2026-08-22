import assert from 'node:assert/strict';
import { extractDocxText } from '../supabase/functions/_shared/docx.js';
import { normalizeAnalysis, readinessLabel } from '../supabase/functions/_shared/analysis-contract.js';
import { readFile } from 'node:fs/promises';

function u16(value) { return Uint8Array.from([value & 255, (value >>> 8) & 255]); }
function u32(value) { return Uint8Array.from([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
function join(parts) { const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; } return output; }

function storedZip(name, content, flags = 0x0800) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  const data = encoder.encode(content);
  const local = join([u32(0x04034b50), u16(20), u16(flags), u16(0), u16(0), u16(0), u32(0), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data]);
  const central = join([u32(0x02014b50), u16(20), u16(20), u16(flags), u16(0), u16(0), u16(0), u32(0), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), nameBytes]);
  return join([local, central, u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0)]);
}

const text = 'Designed and shipped reliable AI systems with measurable outcomes for learners and engineering teams. '.repeat(3);
const xml = `<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`;
assert.equal(await extractDocxText(storedZip('word/document.xml', xml)), text.trim());
await assert.rejects(() => extractDocxText(storedZip('word/document.xml', xml, 0x0801)), /docx_encrypted/);
await assert.rejects(() => extractDocxText(storedZip('other.xml', xml)), /docx_document_missing/);

const dimensions = ['role-alignment', 'evidence', 'impact', 'skills', 'clarity'].map((id) => ({ id, label: id, score: 63, rationale: 'Evidence-based rationale', evidence: ['Found'], gaps: ['Improve'] }));
const careerSignals = ['decision-velocity', 'authority-gap', 'narrative-scarcity', 'authority-signal', 'seniority-perception', 'operational-roi', 'governance', 'observability', 'scalability'].map((id) => ({ id, label: id, score: 58, finding: 'CV-grounded finding' }));
const normalized = normalizeAnalysis({ summary: 'Summary', roleReadinessScore: 63.4, readinessRationale: 'Rationale', confidence: 'Based only on the CV.', dimensions, careerSignals, strengths: ['One'], missingSkills: ['Two'], improvementPlan: ['Three'], suggestions: [{ section: 'Experience', original: 'Old', replacement: 'New', rationale: 'Clearer', impact: 'Evidence' }], structuredCv: { name: 'Learner', contact: '', headline: 'Engineer', summary: 'Profile', skills: ['Python'], experience: [], education: [] } });
assert.equal(normalized.roleReadinessScore, 63);
assert.equal(normalized.roleReadinessLabel, 'competitive');
assert.equal(readinessLabel(80), 'strong');
assert.equal(readinessLabel(34), 'early');
assert.throws(() => normalizeAnalysis({ summary: 'x', readinessRationale: 'y', dimensions: dimensions.slice(0, 4), careerSignals }), /provider_schema_invalid/);
assert.ok(!JSON.stringify(normalized).includes('<script>'));

const edge = await readFile(new URL('../supabase/functions/cv-api/index.ts', import.meta.url), 'utf8');
const browser = await readFile(new URL('../site/cv-analysis.js', import.meta.url), 'utf8');
for (const provider of ['gemini', 'openai', 'anthropic']) {
  assert.ok(edge.includes(provider), `Edge provider catalog must include ${provider}`);
  assert.ok(browser.includes(provider), `Browser provider catalog must include ${provider}`);
}
assert.ok(edge.includes("api.openai.com/v1/responses"));
assert.ok(edge.includes("api.anthropic.com/v1/messages"));
assert.ok(edge.includes("gemini-3.5-flash"), 'Gemini 3.5 Flash must remain an allowlisted model');
assert.ok(browser.includes("gemini-3.5-flash"), 'Gemini 3.5 Flash must remain selectable in the browser');
assert.ok(!edge.includes("responseSchema: analysisSchema()"), 'Gemini requests must avoid the oversized strict schema and rely on server-side validation');
assert.ok(edge.includes("body.connectionId"));
assert.ok(!edge.includes("!/^[A-Za-z0-9_-]+$/.test(secret)"), 'provider keys must be validated by their provider, not a Gemini-only character regex');
assert.ok(edge.includes("if (previous.data)"), 'a failed key replacement must preserve the previous provider connection');

console.log('CV server document and structured-analysis contracts are valid.');
