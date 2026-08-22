/**
 * Private, deterministic CV-to-curriculum analysis for Codeology.
 * The module has no network, storage, DOM, model, or file-system access.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CodeologyCVAnalysis = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LIMITS = Object.freeze({ minCharacters: 120, maxCharacters: 50000, maxJobCharacters: 20000 });

  var ROLE_PROFILES = Object.freeze({
    'ai-engineer': {
      label: 'AI Engineer',
      areas: [
        area('ml-foundations', 'ML foundations', ['python', 'numpy', 'pytorch', 'tensorflow', 'machine learning', 'deep learning', 'neural network', 'feature engineering'], ['ML Pipelines & Experiment Tracking', 'Introduction to PyTorch']),
        area('llm-systems', 'LLM systems', ['llm', 'large language model', 'transformer', 'embedding', 'rag', 'retrieval augmented', 'fine-tuning', 'prompt engineering'], ['Building a Production LLM App', 'RAG: Retrieval-Augmented Generation']),
        area('evaluation', 'Evaluation', ['evaluation', 'evals', 'benchmark', 'accuracy', 'precision', 'recall', 'f1', 'cross-validation', 'a/b test'], ['Evaluation & Testing', 'Evaluation — Benchmarks, Evals']),
        area('production', 'Production delivery', ['api', 'deployment', 'docker', 'kubernetes', 'cloud', 'aws', 'azure', 'gcp', 'monitoring', 'observability', 'ci/cd'], ['Building a Production LLM App', 'LLM Observability Stack Selection']),
        area('responsible-ai', 'Responsible AI', ['guardrail', 'safety', 'privacy', 'bias', 'fairness', 'security', 'governance', 'red team', 'prompt injection'], ['Guardrails & Safety', 'Bias & Representational Harm'])
      ]
    },
    'ml-engineer': {
      label: 'Machine Learning Engineer',
      areas: [
        area('modeling', 'Model development', ['python', 'pytorch', 'tensorflow', 'scikit-learn', 'regression', 'classification', 'deep learning', 'training'], ['Model Evaluation: Metrics, Cross-Validation', 'Introduction to PyTorch']),
        area('data', 'Data and features', ['sql', 'data pipeline', 'feature engineering', 'data quality', 'etl', 'dataset', 'pandas', 'spark'], ['Feature Engineering & Selection', 'Data Pipelines for Pre-Training']),
        area('evaluation', 'Evaluation', ['evaluation', 'cross-validation', 'benchmark', 'accuracy', 'precision', 'recall', 'f1', 'experiment tracking'], ['Model Evaluation: Metrics, Cross-Validation', 'ML Pipelines & Experiment Tracking']),
        area('mlops', 'MLOps', ['mlops', 'deployment', 'docker', 'kubernetes', 'model registry', 'monitoring', 'drift', 'ci/cd', 'cloud'], ['ML Pipelines & Experiment Tracking', 'Shadow, Canary, and Progressive Deployment']),
        area('systems', 'Systems thinking', ['api', 'distributed', 'scalability', 'latency', 'throughput', 'reliability', 'architecture', 'production'], ['Inference Metrics — TTFT, TPOT, ITL, Goodput, P99', 'Building a Complete LLM Pipeline'])
      ]
    },
    'llm-engineer': {
      label: 'LLM Application Engineer',
      areas: [
        area('llm-core', 'LLM foundations', ['llm', 'large language model', 'transformer', 'tokenizer', 'attention', 'fine-tuning', 'lora', 'quantization'], ['Building a Tokenizer from Scratch', 'The Full Transformer: Encoder + Decoder']),
        area('rag-context', 'Retrieval and context', ['rag', 'retrieval', 'embedding', 'vector database', 'chunking', 'reranking', 'context engineering', 'semantic search'], ['Advanced RAG: Chunking, Reranking', 'Context Engineering']),
        area('tools', 'Tools and integration', ['function calling', 'tool use', 'mcp', 'model context protocol', 'structured output', 'api', 'agent'], ['Function Calling & Tool Use', 'MCP Fundamentals']),
        area('evaluation-safety', 'Evaluation and safety', ['evaluation', 'evals', 'guardrail', 'prompt injection', 'red team', 'safety', 'hallucination', 'groundedness'], ['Evaluation & Testing', 'Prompt Injection and the PVE Defense']),
        area('production', 'Production delivery', ['deployment', 'docker', 'kubernetes', 'monitoring', 'observability', 'latency', 'caching', 'rate limiting', 'cost'], ['Caching, Rate Limiting & Cost', 'Building a Production LLM App'])
      ]
    },
    'agent-engineer': {
      label: 'Agent Engineer',
      areas: [
        area('agent-core', 'Agent architecture', ['agent', 'agentic', 'orchestration', 'planner', 'executor', 'state machine', 'workflow', 'multi-agent'], ['The Agent Loop', 'Orchestration Patterns — Supervisor, Swarm, Hierarchical']),
        area('tools', 'Tools and protocols', ['tool use', 'function calling', 'mcp', 'model context protocol', 'api', 'json-rpc', 'a2a', 'structured output'], ['Tool Schema Design', 'Building an MCP Server']),
        area('reliability', 'Reliability and evaluation', ['evaluation', 'evals', 'benchmark', 'retry', 'checkpoint', 'idempotent', 'verification', 'failure mode', 'observability'], ['Eval-Driven Agent Development', 'Failure Modes — Why Agents Break']),
        area('security', 'Agent security', ['prompt injection', 'security', 'permission', 'sandbox', 'guardrail', 'least privilege', 'human in the loop', 'hitl'], ['MCP Security I — Tool Poisoning', 'Permission Modes for Autonomous Agents']),
        area('production', 'Production runtime', ['queue', 'event', 'cron', 'deployment', 'docker', 'kubernetes', 'durable', 'monitoring', 'tracing', 'production'], ['Production Agent Runtimes', 'Production Runtimes — Queue, Event, Cron'])
      ]
    },
    'mlops-engineer': {
      label: 'MLOps / AI Platform Engineer',
      areas: [
        area('platform', 'Platform engineering', ['kubernetes', 'docker', 'terraform', 'cloud', 'aws', 'azure', 'gcp', 'platform', 'infrastructure'], ['GPU Autoscaling on Kubernetes — Karpenter, KAI Scheduler', 'Managed LLM Platforms — Bedrock, Azure OpenAI, Vertex AI']),
        area('serving', 'Model serving', ['inference', 'serving', 'gpu', 'autoscaling', 'latency', 'throughput', 'batching', 'quantization', 'model registry'], ['Serving Engine Internals — PagedAttention, Continuous Batching, Chunked Prefill', 'Production Quantization — AWQ, GPTQ, GGUF, FP8, NVFP4']),
        area('observability', 'Observability and SRE', ['monitoring', 'observability', 'tracing', 'metrics', 'slo', 'sla', 'incident', 'reliability', 'otel'], ['LLM Observability Stack Selection', 'SRE for AI — Multi-Agent Incident Response']),
        area('delivery', 'Delivery automation', ['ci/cd', 'pipeline', 'deployment', 'canary', 'rollback', 'gitops', 'automation', 'testing'], ['Shadow, Canary, and Progressive Deployment', 'ML Pipelines & Experiment Tracking']),
        area('governance', 'Cost, security, and governance', ['finops', 'cost', 'security', 'privacy', 'audit', 'compliance', 'governance', 'access control', 'secrets'], ['FinOps for LLMs — Unit Economics and Multi-Tenant Attribution', 'Security — Secrets, PII Scrubbing, Audit Logs'])
      ]
    },
    'data-engineer': {
      label: 'Data Engineer',
      areas: [
        area('pipelines', 'Data pipelines', ['etl', 'elt', 'pipeline', 'orchestration', 'airflow', 'dag', 'batch', 'streaming', 'kafka'], ['Data Pipelines for Pre-Training', 'Stochastic Processes']),
        area('storage', 'Storage and modeling', ['sql', 'warehouse', 'lakehouse', 'database', 'schema', 'data model', 'spark', 'dbt'], ['Data Management', 'HDF5 Tokenized Corpus']),
        area('quality', 'Data quality', ['data quality', 'validation', 'lineage', 'governance', 'testing', 'observability', 'catalog', 'sla'], ['Data Provenance & Training-Data Governance', 'ML Pipelines & Experiment Tracking']),
        area('production', 'Production systems', ['cloud', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'distributed', 'scalability', 'reliability'], ['Multi-Region LLM Serving and KV Cache Locality', 'Docker for AI']),
        area('ai-data', 'AI data systems', ['embedding', 'vector database', 'retrieval', 'rag', 'dataset', 'tokenization', 'feature store', 'machine learning'], ['Embeddings & Vector Representations', 'Chunking Strategies for RAG'])
      ]
    },
    'software-engineer': {
      label: 'Software Engineer',
      areas: [
        area('delivery', 'Software delivery', ['git', 'ci/cd', 'deployment', 'release', 'agile', 'production', 'feature', 'migration'], ['Git & Collaboration', 'Verification Gates']),
        area('systems', 'APIs and systems', ['api', 'service', 'distributed', 'architecture', 'database', 'queue', 'cache', 'scalability', 'performance'], ['APIs & Keys', 'Caching, Rate Limiting & Cost']),
        area('quality', 'Testing and reliability', ['test', 'testing', 'unit test', 'integration test', 'reliability', 'incident', 'debugging', 'observability'], ['Debugging & Profiling', 'Evaluation & Testing']),
        area('operations', 'Infrastructure', ['docker', 'kubernetes', 'cloud', 'aws', 'azure', 'gcp', 'terraform', 'monitoring', 'security'], ['Docker for AI', 'Security — Secrets, PII Scrubbing, Audit Logs']),
        area('collaboration', 'Technical collaboration', ['mentored', 'led', 'collaborated', 'stakeholder', 'reviewed', 'documented', 'presented', 'cross-functional'], ['Git & Collaboration', 'Reviewer Agent: Separate Builder from Marker'])
      ]
    }
  });

  var SECTION_PATTERNS = Object.freeze([
    { id: 'summary', label: 'Summary', pattern: /(?:^|\n)\s*(?:professional\s+)?summary\s*[:\n]/i },
    { id: 'experience', label: 'Experience', pattern: /(?:^|\n)\s*(?:work\s+|professional\s+)?experience\s*[:\n]/i },
    { id: 'skills', label: 'Skills', pattern: /(?:^|\n)\s*(?:technical\s+|core\s+)?skills\s*[:\n]/i },
    { id: 'projects', label: 'Projects', pattern: /(?:^|\n)\s*(?:selected\s+|technical\s+)?projects\s*[:\n]/i },
    { id: 'education', label: 'Education', pattern: /(?:^|\n)\s*education\s*[:\n]/i },
    { id: 'certifications', label: 'Certifications', pattern: /(?:^|\n)\s*certifications?\s*[:\n]/i }
  ]);

  var SIGNALS = Object.freeze([
    signal('outcomes', 'Quantified outcomes', /(?:\b\d[\d,]*(?:\.\d+)?\s*(?:%|x|ms|s|minutes?|hours?|days?|users?|requests?|transactions?|models?|services?|teams?|projects?|million|billion|k|m)(?=\s|[.,;:)]|$)|[$£€]\s?\d[\d,]*(?:\.\d+)?)/i, 'Add scale, speed, quality, cost, or adoption measures where you can substantiate them.'),
    signal('ownership', 'Ownership', /\b(?:owned|led|architected|designed|drove|initiated|established|directed|founded|launched)\b/i, 'Use accurate ownership verbs to distinguish your decisions from team activity.'),
    signal('impact', 'Outcome language', /\b(?:improved|increased|reduced|saved|accelerated|eliminated|enabled|grew|cut|raised|lowered|optimized|optimised)\b/i, 'Connect implementation work to a user, reliability, delivery, or business outcome.'),
    signal('reliability', 'Reliability', /\b(?:reliability|availability|incident|slo|sla|monitoring|observability|latency|uptime|recovery|resilien(?:ce|t))\b/i, 'Describe the reliability constraint, your intervention, and the observed result.'),
    signal('collaboration', 'Collaboration', /\b(?:collaborated|mentored|partnered|stakeholder|cross-functional|reviewed|coached|presented|facilitated)\b/i, 'Show how you worked with others and what changed because of that collaboration.')
  ]);

  function area(id, label, terms, lessonQueries) {
    return Object.freeze({ id: id, label: label, terms: Object.freeze(terms), lessonQueries: Object.freeze(lessonQueries) });
  }

  function signal(id, label, pattern, prompt) {
    return Object.freeze({ id: id, label: label, pattern: pattern, prompt: prompt });
  }

  function normalizedText(value) {
    return String(value == null ? '' : value).replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
  }

  function countWords(text) {
    var words = text.match(/[A-Za-z0-9][A-Za-z0-9+#./-]*/g);
    return words ? words.length : 0;
  }

  function containsTerm(lowerText, term) {
    var normalizedTerm = term.toLowerCase();
    if (/^[a-z0-9 ]+$/.test(normalizedTerm)) {
      var escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'i').test(lowerText);
    }
    return lowerText.indexOf(normalizedTerm) !== -1;
  }

  function matchedTerms(text, terms) {
    var lowerText = text.toLowerCase();
    return terms.filter(function (term) { return containsTerm(lowerText, term); });
  }

  function statusForCount(count) {
    if (count >= 3) return 'clear';
    if (count > 0) return 'some';
    return 'not-found';
  }

  function detectSections(text) {
    return SECTION_PATTERNS.filter(function (section) { return section.pattern.test(text); }).map(function (section) {
      return { id: section.id, label: section.label };
    });
  }

  function analyzeSignals(text) {
    return SIGNALS.map(function (item) {
      var matches = text.match(new RegExp(item.pattern.source, 'gi')) || [];
      return {
        id: item.id,
        label: item.label,
        status: statusForCount(matches.length),
        occurrences: matches.length,
        editPrompt: item.prompt
      };
    });
  }

  function unique(values) {
    return values.filter(function (value, index) { return values.indexOf(value) === index; });
  }

  function analyze(cvText, targetRole, jobDescription) {
    var text = normalizedText(cvText);
    var jobText = normalizedText(jobDescription);
    var profile = ROLE_PROFILES[targetRole];

    if (!profile) throw new Error('Choose a supported target role.');
    if (text.length < LIMITS.minCharacters) throw new Error('Add at least ' + LIMITS.minCharacters + ' characters of CV text.');
    if (text.length > LIMITS.maxCharacters) throw new Error('CV text must be ' + LIMITS.maxCharacters.toLocaleString('en-US') + ' characters or fewer.');
    if (jobText.length > LIMITS.maxJobCharacters) throw new Error('Role context must be ' + LIMITS.maxJobCharacters.toLocaleString('en-US') + ' characters or fewer.');

    var comparisonText = text + (jobText ? '\n' + jobText : '');
    var roleAreas = profile.areas.map(function (profileArea) {
      var cvMatches = matchedTerms(text, profileArea.terms);
      var jobMatches = jobText ? matchedTerms(jobText, profileArea.terms) : [];
      return {
        id: profileArea.id,
        label: profileArea.label,
        status: statusForCount(cvMatches.length),
        matchedTerms: cvMatches,
        roleContextTerms: jobMatches.filter(function (term) { return cvMatches.indexOf(term) === -1; }),
        lessonQueries: profileArea.lessonQueries.slice()
      };
    });

    var signals = analyzeSignals(text);
    var sections = detectSections(text);
    var clearAreas = roleAreas.filter(function (item) { return item.status === 'clear'; }).length;
    var someAreas = roleAreas.filter(function (item) { return item.status === 'some'; }).length;
    var missingAreas = roleAreas.filter(function (item) { return item.status === 'not-found'; }).length;
    var priorityAreas = roleAreas.slice().sort(function (first, second) {
      var rank = { 'not-found': 0, some: 1, clear: 2 };
      return rank[first.status] - rank[second.status];
    });
    var lessonQueries = unique([].concat.apply([], priorityAreas.map(function (item) { return item.lessonQueries; }))).slice(0, 6);
    var editPrompts = signals.filter(function (item) { return item.status !== 'clear'; }).map(function (item) { return item.editPrompt; });

    if (sections.length < 3) editPrompts.unshift('Use clear Summary, Experience, Skills, Projects, and Education headings where they reflect your background.');
    if (jobText) {
      var absentContext = unique([].concat.apply([], roleAreas.map(function (item) { return item.roleContextTerms; }))).slice(0, 6);
      if (absentContext.length) editPrompts.unshift('Review the role context for relevant experience you can substantiate: ' + absentContext.join(', ') + '.');
    }

    var summary = 'For ' + profile.label + ', the CV shows clear evidence in ' + clearAreas + ' of ' + roleAreas.length + ' role areas';
    if (someAreas) summary += ', with some evidence in ' + someAreas;
    if (missingAreas) summary += ' and no matching language found in ' + missingAreas;
    summary += '. This is a writing and curriculum guide, not an employment assessment.';

    return {
      role: { id: targetRole, label: profile.label },
      summary: summary,
      document: {
        characterCount: text.length,
        wordCount: countWords(text),
        sections: sections,
        quantifiedStatements: signals.filter(function (item) { return item.id === 'outcomes'; })[0].occurrences
      },
      signals: signals,
      roleAreas: roleAreas,
      editPrompts: unique(editPrompts).slice(0, 6),
      lessonQueries: lessonQueries,
      comparedWithRoleContext: Boolean(jobText),
      policy: {
        kind: 'formative-local',
        persisted: false,
        transmitted: false,
        claimsJobReadiness: false
      },
      comparisonTermCount: matchedTerms(comparisonText, unique([].concat.apply([], profile.areas.map(function (item) { return item.terms; })))).length
    };
  }

  return Object.freeze({
    LIMITS: LIMITS,
    ROLE_PROFILES: ROLE_PROFILES,
    analyze: analyze
  });
}));
