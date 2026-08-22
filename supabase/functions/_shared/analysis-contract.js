const DIMENSION_IDS = new Set(['role-alignment', 'evidence', 'impact', 'skills', 'clarity']);
const CAREER_SIGNAL_IDS = new Set(['decision-velocity', 'authority-gap', 'narrative-scarcity', 'authority-signal', 'seniority-perception', 'operational-roi', 'governance', 'observability', 'scalability']);

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function stringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return value.map(function (item) { return cleanText(item, maxLength); }).filter(Boolean).slice(0, maxItems);
}

function score(value) {
  var number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function readinessLabel(value) {
  if (value >= 80) return 'strong';
  if (value >= 60) return 'competitive';
  if (value >= 35) return 'developing';
  return 'early';
}

export function normalizeAnalysis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('provider_schema_invalid');
  var roleScore = score(value.roleReadinessScore);
  var dimensions = Array.isArray(value.dimensions) ? value.dimensions.map(function (item) {
    var id = cleanText(item && item.id, 32);
    if (!DIMENSION_IDS.has(id)) return null;
    return {
      id: id,
      label: cleanText(item.label, 64),
      score: score(item.score),
      rationale: cleanText(item.rationale, 800),
      evidence: stringList(item.evidence, 5, 300),
      gaps: stringList(item.gaps, 5, 300),
    };
  }).filter(Boolean) : [];
  if (dimensions.length !== 5 || new Set(dimensions.map(function (item) { return item.id; })).size !== 5) {
    throw new Error('provider_schema_invalid');
  }
  var careerSignals = Array.isArray(value.careerSignals) ? value.careerSignals.map(function (item) {
    var id = cleanText(item && item.id, 32);
    if (!CAREER_SIGNAL_IDS.has(id)) return null;
    return { id: id, label: cleanText(item.label, 64), score: score(item.score), finding: cleanText(item.finding, 600) };
  }).filter(Boolean) : [];
  if (careerSignals.length !== 9 || new Set(careerSignals.map(function (item) { return item.id; })).size !== 9) {
    throw new Error('provider_schema_invalid');
  }

  var suggestions = Array.isArray(value.suggestions) ? value.suggestions.map(function (item) {
    return {
      section: cleanText(item && item.section, 80),
      original: cleanText(item && item.original, 800),
      replacement: cleanText(item && item.replacement, 1200),
      rationale: cleanText(item && item.rationale, 600),
      impact: cleanText(item && item.impact, 300),
    };
  }).filter(function (item) { return item.replacement && item.rationale; }).slice(0, 12) : [];

  var source = value.structuredCv && typeof value.structuredCv === 'object' ? value.structuredCv : {};
  var experience = Array.isArray(source.experience) ? source.experience.map(function (item) {
    return {
      title: cleanText(item && item.title, 160),
      company: cleanText(item && item.company, 160),
      dates: cleanText(item && item.dates, 100),
      bullets: stringList(item && item.bullets, 12, 800),
    };
  }).filter(function (item) { return item.title || item.company || item.bullets.length; }).slice(0, 20) : [];
  var education = Array.isArray(source.education) ? source.education.map(function (item) {
    return {
      qualification: cleanText(item && item.qualification, 200),
      institution: cleanText(item && item.institution, 200),
      dates: cleanText(item && item.dates, 100),
    };
  }).filter(function (item) { return item.qualification || item.institution; }).slice(0, 12) : [];

  var normalized = {
    summary: cleanText(value.summary, 1200),
    roleReadinessScore: roleScore,
    roleReadinessLabel: readinessLabel(roleScore),
    readinessRationale: cleanText(value.readinessRationale, 1200),
    confidence: cleanText(value.confidence, 300),
    dimensions: dimensions,
    careerSignals: careerSignals,
    strengths: stringList(value.strengths, 10, 400),
    missingSkills: stringList(value.missingSkills, 12, 200),
    improvementPlan: stringList(value.improvementPlan, 10, 500),
    suggestions: suggestions,
    structuredCv: {
      name: cleanText(source.name, 160),
      contact: cleanText(source.contact, 300),
      headline: cleanText(source.headline, 240),
      summary: cleanText(source.summary, 1200),
      skills: stringList(source.skills, 40, 100),
      experience: experience,
      education: education,
    },
  };
  if (!normalized.summary || !normalized.readinessRationale) throw new Error('provider_schema_invalid');
  return normalized;
}
