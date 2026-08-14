(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var LEVEL_LABELS = ['Dormant', 'Started', 'Learning complete', 'Applied strength', 'Evidence proven'];
  var BAND_LABELS = ['Foundations', 'Intern-ready scope', 'Junior-ready scope', 'Senior scope', 'Lead scope'];
  var CENTER = { x: 500, y: 500 };
  var SAFE_RADIUS = 442;

  var domains = [
    domain('systems', 'Systems', 155, 38, 'Operating systems, hardware boundaries, networking and performance.', [
      skill('systems-core', 'Systems core'), skill('os', 'Operating systems'), skill('networks', 'Networking'),
      skill('concurrency', 'Concurrency'), skill('performance', 'Performance'), skill('embedded', 'Embedded'), skill('kernels', 'Kernels')
    ], [['systems-core', 'os'], ['systems-core', 'networks'], ['os', 'concurrency'], ['os', 'kernels'], ['concurrency', 'performance'], ['networks', 'embedded']]),
    domain('cyber', 'Cybersecurity', -165, 32, 'Secure design, identity, testing, detection and incident response.', [
      skill('cyber-core', 'Security core'), skill('appsec', 'Application security'), skill('identity', 'Identity'),
      skill('threats', 'Threat modelling'), skill('testing', 'Security testing'), skill('response', 'Incident response'), skill('cloudsec', 'Cloud security')
    ], [['cyber-core', 'appsec'], ['cyber-core', 'identity'], ['appsec', 'threats'], ['appsec', 'testing'], ['identity', 'cloudsec'], ['testing', 'response']]),
    domain('cloud', 'Cloud & SRE', -130, 26, 'Resilient services, infrastructure automation, observability and reliability.', [
      skill('cloud-core', 'Cloud core'), skill('containers', 'Containers'), skill('iac', 'Infrastructure as code'),
      skill('delivery', 'Delivery systems'), skill('observability', 'Observability'), skill('reliability', 'Reliability'), skill('platforms', 'Platform engineering')
    ], [['cloud-core', 'containers'], ['cloud-core', 'iac'], ['containers', 'delivery'], ['iac', 'observability'], ['delivery', 'reliability'], ['observability', 'platforms']]),
    { id: 'ai', title: 'Data & AI', angle: -90, width: 46, description: 'Data systems, machine-learning foundations and production AI engineering.', skills: [], graph: null, band: 3 },
    domain('backend', 'Backend', -49, 22, 'APIs, databases and distributed services that remain reliable as they grow.', [
      skill('backend-core', 'Backend core'), skill('apis', 'API design'), skill('databases', 'Databases'),
      skill('services', 'Service architecture'), skill('distributed', 'Distributed systems'), skill('queues', 'Messaging'), skill('scale', 'Scale & resilience')
    ], [['backend-core', 'apis'], ['backend-core', 'databases'], ['apis', 'services'], ['databases', 'queues'], ['services', 'distributed'], ['distributed', 'scale']]),
    domain('web', 'Web & Product', -25, 18, 'Accessible, stateful and fast product experiences for the web.', [
      skill('web-core', 'Web core'), skill('html-css', 'Web platform'), skill('javascript', 'JavaScript'),
      skill('accessibility', 'Accessibility'), skill('state', 'Application state'), skill('performance-web', 'Web performance'), skill('product', 'Product systems')
    ], [['web-core', 'html-css'], ['web-core', 'javascript'], ['html-css', 'accessibility'], ['javascript', 'state'], ['state', 'product'], ['accessibility', 'performance-web']]),
    domain('mobile', 'Mobile', 0, 22, 'Native and cross-platform applications with resilient state and platform integration.', [
      skill('mobile-core', 'Mobile core'), skill('platform-api', 'Platform APIs'), skill('mobile-ui', 'Native UI'),
      skill('offline', 'Offline state'), skill('device', 'Device integration'), skill('mobile-delivery', 'Mobile delivery'), skill('mobile-performance', 'Mobile performance')
    ], [['mobile-core', 'platform-api'], ['mobile-core', 'mobile-ui'], ['platform-api', 'device'], ['platform-api', 'offline'], ['mobile-ui', 'mobile-performance'], ['offline', 'mobile-delivery']]),
    domain('game', 'Games & Graphics', 35, 38, 'Interactive simulation, rendering and real-time systems.', [
      skill('game-core', 'Interactive core'), skill('loops', 'Game loops'), skill('rendering', 'Rendering'),
      skill('physics', 'Simulation'), skill('shaders', 'Shaders'), skill('engines', 'Engine architecture'), skill('realtime', 'Real-time systems')
    ], [['game-core', 'loops'], ['game-core', 'rendering'], ['loops', 'physics'], ['loops', 'engines'], ['rendering', 'shaders'], ['engines', 'realtime']])
  ];

  var foundation = domain('foundation', 'Shared foundations', 90, 58, 'The common roots that support every software engineering pathway.', [
    skill('foundation-core', 'Computing foundations'), skill('languages', 'Programming languages'), skill('devtools', 'Developer tools'),
    skill('dsa', 'Data structures & algorithms'), skill('git', 'Git & collaboration'), skill('linux', 'Linux & shell'),
    skill('data', 'Data fundamentals'), skill('testing-core', 'Testing'), skill('networking-core', 'Networking basics')
  ], [['foundation-core', 'languages'], ['foundation-core', 'devtools'], ['languages', 'dsa'], ['languages', 'data'], ['devtools', 'git'], ['devtools', 'linux'], ['dsa', 'testing-core'], ['linux', 'networking-core']]);

  var svg;
  var inspector;
  var viewport;
  var layouts = {};
  var aiRoadmap = [];
  var selectedId = 'ai';
  var selectedNode = null;
  var previewLevel = 2;
  var zoom = 1;
  var view = { x: 0, y: 0, width: 1000, height: 1000 };
  var dragState = null;
  var interactiveNodes = [];

  document.addEventListener('DOMContentLoaded', init);

  function skill(id, title) {
    return { id: id, title: title, description: title + ' learning route.' };
  }

  function domain(id, title, angle, width, description, nodes, edges) {
    return {
      id: id,
      title: title,
      angle: angle,
      width: width,
      description: description,
      skills: nodes.slice(1, 4).map(function (node) { return node.title; }),
      graph: { nodes: nodes, edges: edges.map(function (edge) { return { from: edge[0], to: edge[1] }; }) },
      band: id === 'foundation' ? 0 : 3
    };
  }

  function svgEl(tag, attrs) {
    var element = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (name) { element.setAttribute(name, attrs[name]); });
    return element;
  }

  function init() {
    svg = document.getElementById('lifeTreeGraph');
    inspector = document.getElementById('lifeTreeInspector');
    if (!svg || !inspector || !window.CodeologySkillTreeEngine) return;
    prepareAiRoadmap();
    buildLayouts();
    renderTree();
    bindControls();
    updateTree();
    applyView();
    centerTreeViewport();
    window.addEventListener('resize', centerTreeViewport);
  }

  function prepareAiRoadmap() {
    aiRoadmap = typeof PHASES !== 'undefined' && Array.isArray(PHASES)
      ? PHASES.slice().sort(function (a, b) { return a.id - b.id; })
      : [];
    var phaseNodes = aiRoadmap.map(function (phase) {
      return {
        id: 'ai-' + phase.id,
        title: phase.name,
        description: phase.desc || 'AI Engineering pathway phase.',
        phase: phase,
        code: padPhase(phase.id)
      };
    });
    var phaseIds = {};
    aiRoadmap.forEach(function (phase) { phaseIds[phase.id] = true; });
    var phaseEdges = [];
    aiRoadmap.forEach(function (phase) {
      var prereqs = typeof ROADMAP_PREREQS !== 'undefined' && ROADMAP_PREREQS[phase.id]
        ? ROADMAP_PREREQS[phase.id]
        : [];
      prereqs.forEach(function (parentId) {
        if (phaseIds[parentId]) phaseEdges.push({ from: 'ai-' + parentId, to: 'ai-' + phase.id });
      });
    });
    domains.filter(function (item) { return item.id === 'ai'; })[0].graph = { nodes: phaseNodes, edges: phaseEdges };
    domains.filter(function (item) { return item.id === 'ai'; })[0].skills = phaseNodes.slice(0, 3).map(function (node) { return node.title; });
  }

  function buildAiLayout(graph, settings) {
    return window.CodeologySkillTreeEngine.layoutGraph(graph, settings);
  }

  function capToCircle(point, radius) {
    return window.CodeologySkillTreeEngine.capToCircle(point, CENTER, radius);
  }

  function buildLayouts() {
    domains.concat([foundation]).forEach(function (item) {
      if (!item.graph || !item.graph.nodes.length) return;
      var settings = {
        center: CENTER,
        circleRadius: SAFE_RADIUS,
        innerRadius: item.id === 'foundation' ? 104 : 128,
        outerRadius: 425,
        startAngle: item.angle - item.width / 2,
        endAngle: item.angle + item.width / 2
      };
      layouts[item.id] = item.id === 'ai'
        ? buildAiLayout(item.graph, settings)
        : window.CodeologySkillTreeEngine.layoutGraph(item.graph, settings);
    });
    capToCircle({ x: 500, y: 960 }, SAFE_RADIUS);
  }

  function renderTree() {
    svg.textContent = '';
    interactiveNodes = [];
    var title = svgEl('title', { id: 'lifeTreeSvgTitle' });
    title.textContent = 'Circular software engineering skill tree';
    var description = svgEl('desc', { id: 'lifeTreeSvgDescription' });
    description.textContent = 'A reusable dependency graph engine arranges shared foundations and eight software engineering disciplines inside one circular map.';
    svg.appendChild(title);
    svg.appendChild(description);

    viewport = svgEl('g', { class: 'life-tree-viewport' });
    var rings = svgEl('g', { class: 'life-tree-rings', 'aria-hidden': 'true' });
    rings.appendChild(svgEl('circle', { class: 'life-tree-boundary', cx: 500, cy: 500, r: 455 }));
    [128, 225, 325, 425].forEach(function (radius) {
      rings.appendChild(svgEl('circle', { class: 'life-tree-ring', cx: 500, cy: 500, r: radius }));
    });
    viewport.appendChild(rings);

    var structure = svgEl('g', { class: 'life-tree-structure', 'data-strength': '0', 'aria-hidden': 'true' });
    structure.appendChild(svgEl('circle', { class: 'life-tree-trunk', cx: 500, cy: 500, r: 8.5 }));
    viewport.appendChild(structure);

    domains.concat([foundation]).forEach(renderDomainGraph);
    svg.appendChild(viewport);
  }

  function renderDomainGraph(domainItem, domainIndex) {
    var layout = layouts[domainItem.id];
    if (!layout) return;
    var group = svgEl('g', {
      class: 'life-tree-domain life-tree-dag' + (domainItem.id === 'ai' ? ' life-tree-ai-roadmap' : ''),
      'data-domain': domainItem.id,
      'data-index': domainIndex,
      'data-strength': '0',
      role: 'group',
      'aria-label': domainItem.title + ' skill tree'
    });
    var edgeLayer = svgEl('g', { class: 'life-tree-dag-edges', 'aria-hidden': 'true' });
    layout.graph.edges.forEach(function (edge) {
      var secondary = layout.primaryParents[String(edge.to)] !== String(edge.from);
      var spineEdge = layout.centralSpine[String(edge.from)] && layout.centralSpine[String(edge.to)];
      edgeLayer.appendChild(svgEl('path', {
        class: 'life-tree-branch-line life-tree-ai-edge' + (secondary ? ' is-secondary' : '') + (spineEdge ? ' is-spine' : ''),
        d: window.CodeologySkillTreeEngine.edgePath(layout, edge),
        'data-from': edge.from,
        'data-to': edge.to
      }));
    });
    group.appendChild(edgeLayer);

    layout.graph.nodes.forEach(function (node, nodeIndex) {
      var position = layout.positions[String(node.id)];
      var button = svgEl('g', {
        class: 'life-tree-skill-node life-tree-ai-phase' + (position.terminal ? ' is-terminal' : '') + (nodeIndex === 0 ? ' is-domain-root' : ''),
        'data-domain': domainItem.id,
        'data-node': node.id,
        tabindex: domainItem.id === selectedId && nodeIndex === 0 ? '0' : '-1',
        role: 'button',
        'aria-pressed': 'false',
        'aria-label': domainItem.title + ': ' + node.title
      });
      button.appendChild(svgEl('circle', { class: 'life-tree-ai-phase-hit', cx: position.x, cy: position.y, r: 12 }));
      button.appendChild(svgEl('circle', {
        class: 'life-tree-node life-tree-ai-phase-node' + (position.terminal ? ' is-terminal' : ''),
        cx: position.x,
        cy: position.y,
        r: node.phase ? Math.min(4.1, 2.2 + Math.sqrt((node.phase.lessons || []).length) * 0.15) : 3.2
      }));
      var code = svgEl('text', { class: 'life-tree-ai-phase-code life-tree-skill-code', x: position.x, y: position.y - 10 });
      code.textContent = node.code || node.title;
      button.appendChild(code);
      appendSemanticCards(button, node, position);
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        selectSkill(domainItem.id, node.id, true);
      });
      button.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectSkill(domainItem.id, node.id, true);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          moveNodeFocus(button, -1);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          moveNodeFocus(button, 1);
        }
      });
      interactiveNodes.push(button);
      group.appendChild(button);
    });

    var labelRadius = domainItem.id === 'ai' ? 98 : (domainItem.id === 'foundation' ? 170 : 185);
    var labelPoint = polarPoint(labelRadius, domainItem.angle);
    if (domainItem.id !== 'ai' && domainItem.id !== 'foundation') {
      var labelRadians = domainItem.angle * Math.PI / 180;
      var tangentShift = domainIndex % 2 === 0 ? 11 : -11;
      labelPoint.x += -Math.sin(labelRadians) * tangentShift;
      labelPoint.y += Math.cos(labelRadians) * tangentShift;
    }
    var label = svgEl('text', {
      class: 'life-tree-domain-label',
      x: labelPoint.x,
      y: labelPoint.y,
      'text-anchor': 'middle',
      role: 'button',
      tabindex: '-1',
      'data-domain-label': domainItem.id
    });
    label.textContent = domainItem.title;
    label.addEventListener('click', function () { selectDomain(domainItem.id, false); });
    group.appendChild(label);
    if (domainItem.id === 'ai') {
      var countPoint = polarPoint(113, domainItem.angle);
      var count = svgEl('text', { class: 'life-tree-domain-count', x: countPoint.x, y: countPoint.y, 'text-anchor': 'middle' });
      count.textContent = aiRoadmap.length + ' phases · ' + aiLessonCount() + ' lessons';
      group.appendChild(count);
    }
    viewport.appendChild(group);
  }

  function polarPoint(radius, angle) {
    var radians = angle * Math.PI / 180;
    return { x: CENTER.x + Math.cos(radians) * radius, y: CENTER.y + Math.sin(radians) * radius };
  }

  function aiLessonCount() {
    return aiRoadmap.reduce(function (total, phase) { return total + (phase.lessons || []).length; }, 0);
  }

  function appendSemanticCards(button, node, position) {
    var progress = nodeProgress(node);
    var compactOffset = position.lane < 0 ? -13 : (position.lane > 0 ? 13 : 0);
    var compactX = position.x - 27 + compactOffset;
    var compactY = position.y - 7;
    var compact = svgEl('g', { class: 'life-tree-compact-card', 'aria-hidden': 'true' });
    compact.appendChild(svgEl('rect', {
      class: 'life-tree-compact-card-surface', x: compactX, y: compactY, width: 54, height: 14, rx: 4
    }));
    var compactCode = svgEl('text', { class: 'life-tree-compact-card-code', x: compactX + 4, y: compactY + 9 });
    compactCode.textContent = node.code || 'SK';
    compact.appendChild(compactCode);
    var compactTitle = svgEl('text', { class: 'life-tree-compact-card-title', x: compactX + 15, y: compactY + 9 });
    compactTitle.textContent = truncateLabel(node.title, 12);
    compact.appendChild(compactTitle);
    button.appendChild(compact);

    var cardWidth = 104;
    var cardHeight = 42;
    var cardX = position.lane < 0
      ? position.x - cardWidth - 10
      : (position.lane > 0 ? position.x + 10 : position.x - cardWidth / 2);
    var cardY = position.y - cardHeight / 2;
    var full = svgEl('g', { class: 'life-tree-full-card', 'aria-hidden': 'true' });
    if (position.lane !== 0) {
      full.appendChild(svgEl('line', {
        class: 'life-tree-full-card-connector',
        x1: position.x,
        y1: position.y,
        x2: position.lane < 0 ? cardX + cardWidth : cardX,
        y2: position.y
      }));
    }
    full.appendChild(svgEl('rect', {
      class: 'life-tree-full-card-shadow', x: cardX + 2, y: cardY + 2, width: cardWidth, height: cardHeight, rx: 6
    }));
    full.appendChild(svgEl('rect', {
      class: 'life-tree-full-card-surface', x: cardX, y: cardY, width: cardWidth, height: cardHeight, rx: 6
    }));
    var phaseCode = svgEl('text', { class: 'life-tree-full-card-code', x: cardX + 7, y: cardY + 9 });
    phaseCode.textContent = node.code ? 'PHASE ' + node.code : 'SKILL';
    full.appendChild(phaseCode);
    var state = svgEl('text', {
      class: 'life-tree-full-card-state', x: cardX + cardWidth - 7, y: cardY + 9, 'text-anchor': 'end'
    });
    state.textContent = progress.state;
    full.appendChild(state);
    var titleLines = splitCardTitle(node.title);
    titleLines.forEach(function (line, index) {
      var title = svgEl('text', {
        class: 'life-tree-full-card-title', x: cardX + 7, y: cardY + (titleLines.length === 1 ? 24 : 20 + index * 7)
      });
      title.textContent = line;
      full.appendChild(title);
    });
    var meta = svgEl('text', {
      class: 'life-tree-full-card-meta', x: cardX + cardWidth - 7, y: cardY + 35, 'text-anchor': 'end'
    });
    meta.textContent = progress.meta;
    full.appendChild(meta);
    full.appendChild(svgEl('rect', {
      class: 'life-tree-full-card-progress-track', x: cardX + 7, y: cardY + 37, width: cardWidth - 14, height: 2
    }));
    full.appendChild(svgEl('rect', {
      class: 'life-tree-full-card-progress-fill', x: cardX + 7, y: cardY + 37,
      width: (cardWidth - 14) * progress.percent / 100, height: 2
    }));
    button.appendChild(full);
  }

  function nodeProgress(node) {
    var lessons = node.phase && Array.isArray(node.phase.lessons) ? node.phase.lessons : [];
    if (!lessons.length) return { state: 'PREVIEW', meta: 'CURRICULUM SKILL', percent: 0 };
    var urls = lessons.map(function (lesson) { return lesson.url; }).filter(Boolean);
    var done = window.AIFSProgress && typeof window.AIFSProgress.countCompletedFromUrls === 'function'
      ? window.AIFSProgress.countCompletedFromUrls(urls)
      : 0;
    return {
      state: done === lessons.length ? 'COMPLETE' : (done ? 'IN PROGRESS' : 'PHASE'),
      meta: done + '/' + lessons.length + ' LESSONS',
      percent: lessons.length ? Math.round(done / lessons.length * 100) : 0
    };
  }

  function truncateLabel(value, limit) {
    var label = String(value || '').toUpperCase();
    return label.length > limit ? label.slice(0, limit - 1) + '…' : label;
  }

  function splitCardTitle(value) {
    var label = String(value || '').toUpperCase();
    if (label.length <= 21) return [label];
    var split = label.lastIndexOf(' ', 20);
    if (split < 8) split = label.indexOf(' ', 15);
    if (split === -1) return [truncateLabel(label, 21)];
    return [label.slice(0, split), truncateLabel(label.slice(split + 1), 21)];
  }

  function bindControls() {
    document.querySelectorAll('[data-tree-level]').forEach(function (button) {
      button.addEventListener('click', function () {
        previewLevel = Number(button.getAttribute('data-tree-level'));
        document.querySelectorAll('[data-tree-level]').forEach(function (item) {
          item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
        });
        updateTree();
      });
    });
    document.getElementById('lifeTreeZoomOut').addEventListener('click', function () { setZoom(zoom / 1.2); });
    document.getElementById('lifeTreeZoomIn').addEventListener('click', function () { setZoom(zoom * 1.2); });
    document.getElementById('lifeTreeReset').addEventListener('click', resetView);
    svg.addEventListener('wheel', function (event) {
      if (!event.ctrlKey && Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      setZoom(zoom * (event.deltaY < 0 ? 1.12 : 0.89), event.offsetX, event.offsetY);
    }, { passive: false });
    svg.addEventListener('pointerdown', startPan);
    svg.addEventListener('pointermove', movePan);
    svg.addEventListener('pointerup', endPan);
    svg.addEventListener('pointercancel', endPan);
    svg.addEventListener('keydown', function (event) {
      if (event.key === '+' || event.key === '=') setZoom(zoom * 1.2);
      if (event.key === '-') setZoom(zoom / 1.2);
      if (event.key === 'Escape') resetView();
    });
  }

  function setZoom(nextZoom, pointerX, pointerY) {
    var clamped = Math.max(0.85, Math.min(3, nextZoom));
    var focusX = pointerX === undefined ? view.x + view.width / 2 : view.x + pointerX / svg.clientWidth * view.width;
    var focusY = pointerY === undefined ? view.y + view.height / 2 : view.y + pointerY / svg.clientHeight * view.height;
    var nextWidth = 1000 / clamped;
    var nextHeight = 1000 / clamped;
    view.x = focusX - (focusX - view.x) * nextWidth / view.width;
    view.y = focusY - (focusY - view.y) * nextHeight / view.height;
    view.width = nextWidth;
    view.height = nextHeight;
    zoom = clamped;
    constrainView();
    applyView();
  }

  function resetView() {
    zoom = 1;
    view = { x: 0, y: 0, width: 1000, height: 1000 };
    applyView();
    centerTreeViewport();
  }

  function centerTreeViewport() {
    if (!svg || window.innerWidth > 760) return;
    var stage = svg.parentElement;
    if (!stage) return;
    stage.scrollLeft = Math.max(0, (svg.scrollWidth - stage.clientWidth) / 2);
  }

  function constrainView() {
    view.x = Math.max(-80, Math.min(1080 - view.width, view.x));
    view.y = Math.max(-80, Math.min(1080 - view.height, view.y));
  }

  function applyView() {
    svg.setAttribute('viewBox', [view.x, view.y, view.width, view.height].join(' '));
    svg.classList.toggle('is-detail-view', zoom >= 1.35);
    svg.classList.toggle('is-compact-card-view', zoom >= 1.7);
    svg.classList.toggle('is-full-card-view', zoom >= 2.25);
    document.getElementById('lifeTreeZoomValue').textContent = Math.round(zoom * 100) + '%';
  }

  function startPan(event) {
    if (event.button !== 0 || event.target.closest('.life-tree-skill-node')) return;
    dragState = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
    svg.setPointerCapture(event.pointerId);
    svg.classList.add('is-panning');
  }

  function movePan(event) {
    if (!dragState) return;
    view.x = dragState.viewX - (event.clientX - dragState.x) / svg.clientWidth * view.width;
    view.y = dragState.viewY - (event.clientY - dragState.y) / svg.clientHeight * view.height;
    constrainView();
    applyView();
  }

  function endPan(event) {
    if (!dragState) return;
    dragState = null;
    svg.classList.remove('is-panning');
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  }

  function selectDomain(id, shouldFocus) {
    selectedId = id;
    selectedNode = null;
    updateTree();
    if (shouldFocus) {
      var target = interactiveNodes.find(function (node) { return node.getAttribute('data-domain') === id; });
      if (target) target.focus();
    }
  }

  function selectSkill(domainId, nodeId, shouldFocus) {
    selectedId = domainId;
    selectedNode = String(nodeId);
    updateTree();
    if (zoom >= 1.7) centerSkillInView(domainId, nodeId);
    if (shouldFocus) {
      var target = interactiveNodes.find(function (node) {
        return node.getAttribute('data-domain') === domainId && node.getAttribute('data-node') === String(nodeId);
      });
      if (target) target.focus();
    }
  }

  function centerSkillInView(domainId, nodeId) {
    var layout = layouts[domainId];
    var position = layout && layout.positions[String(nodeId)];
    if (!position) return;
    view.x = position.x - view.width / 2;
    view.y = position.y - view.height / 2;
    constrainView();
    applyView();
  }

  function moveNodeFocus(current, direction) {
    var index = interactiveNodes.indexOf(current);
    var next = interactiveNodes[(index + direction + interactiveNodes.length) % interactiveNodes.length];
    selectSkill(next.getAttribute('data-domain'), next.getAttribute('data-node'), true);
  }

  function strengthFor(index, selectedIndex) {
    if (previewLevel === 0) return 0;
    if (index === selectedIndex) return Math.min(4, previewLevel + 1);
    var distance = Math.min(Math.abs(index - selectedIndex), domains.length - Math.abs(index - selectedIndex));
    if (distance === 1) return Math.max(0, previewLevel - 1);
    return previewLevel === 3 ? 1 : 0;
  }

  function updateTree() {
    var selectedIndex = domains.findIndex(function (item) { return item.id === selectedId; });
    svg.querySelectorAll('.life-tree-domain').forEach(function (group) {
      var id = group.getAttribute('data-domain');
      var index = domains.findIndex(function (item) { return item.id === id; });
      var strength = id === 'foundation'
        ? (previewLevel === 0 ? 0 : Math.min(4, previewLevel + 1))
        : strengthFor(index, selectedIndex);
      group.setAttribute('data-strength', String(strength));
      group.classList.toggle('is-selected', id === selectedId);
      group.classList.toggle('has-node-selection', id === selectedId && selectedNode !== null);
    });
    svg.querySelectorAll('.life-tree-skill-node').forEach(function (node) {
      var selected = node.getAttribute('data-domain') === selectedId && node.getAttribute('data-node') === selectedNode;
      node.classList.toggle('is-selected', selected);
      node.setAttribute('aria-pressed', selected ? 'true' : 'false');
      node.setAttribute('tabindex', selected ? '0' : '-1');
    });
    var structure = svg.querySelector('.life-tree-structure');
    if (structure) structure.setAttribute('data-strength', String(previewLevel === 0 ? 0 : Math.min(4, previewLevel + 1)));
    if (selectedNode) renderSkillInspector(selectedId, selectedNode);
    else renderInspector(findDomain(selectedId), selectedIndex < 0 ? previewLevel + 1 : strengthFor(selectedIndex, selectedIndex));
  }

  function findDomain(id) {
    return domains.concat([foundation]).find(function (item) { return item.id === id; }) || domains[3];
  }

  function renderSkillInspector(domainId, nodeId) {
    var domainItem = findDomain(domainId);
    var node = domainItem.graph.nodes.find(function (item) { return String(item.id) === String(nodeId); });
    if (!node) return;
    var layout = layouts[domainId];
    var prereqs = (layout.parents[String(nodeId)] || []).map(function (id) {
      var parent = domainItem.graph.nodes.find(function (item) { return String(item.id) === id; });
      return parent ? parent.title : id;
    });
    var lessons = node.phase && Array.isArray(node.phase.lessons) ? node.phase.lessons : [];
    var firstLessonPath = lessons.length ? localLessonPath(lessons[0].url) : '';
    inspector.innerHTML =
      '<span class="life-tree-inspector-kicker">' + escapeHtml(domainItem.title) + (node.phase ? ' · Phase ' + node.code : ' · Skill') + '</span>' +
      '<h3>' + escapeHtml(node.title) + '</h3>' +
      '<p>' + escapeHtml(node.description) + '</p>' +
      '<dl>' +
        '<div><dt>Prerequisites</dt><dd>' + (prereqs.length ? escapeHtml(prereqs.join(', ')) : 'Branch starting point') + '</dd></div>' +
        '<div><dt>Graph tier</dt><dd>' + (layout.positions[String(nodeId)].depth + 1) + ' of ' + (layout.maxDepth + 1) + '</dd></div>' +
        '<div><dt>Content</dt><dd>' + (node.phase ? lessons.length + ' lessons' : 'Curriculum fixture') + '</dd></div>' +
      '</dl>' +
      (lessons.length ? '<div class="life-tree-inspector-skills">' + lessons.slice(0, 3).map(function (lesson) { return '<span>' + escapeHtml(lesson.name) + '</span>'; }).join('') + '</div>' : '') +
      (firstLessonPath ? '<a class="life-tree-inspector-link" href="lesson.html?path=' + encodeURIComponent(firstLessonPath) + '">Open first lesson</a>' : '') +
      '<p class="life-tree-inspector-note">Solid lines show the primary route. Additional prerequisites stay faint until this skill is selected.</p>';
  }

  function localLessonPath(url) {
    var match = String(url || '').match(/\/phases\/([^?#]+?)\/?$/);
    return match ? 'phases/' + match[1] : '';
  }

  function renderInspector(domainItem, strength) {
    var layout = layouts[domainItem.id];
    var overlapCount = window.CodeologySkillTreeEngine.countApproximateOverlaps(layout, 16);
    inspector.innerHTML =
      '<span class="life-tree-inspector-kicker">Selected branch</span>' +
      '<h3>' + escapeHtml(domainItem.title) + '</h3>' +
      '<p>' + escapeHtml(domainItem.description) + '</p>' +
      '<dl>' +
        '<div><dt>Preview light</dt><dd>Level ' + Math.min(4, strength) + ' · ' + LEVEL_LABELS[Math.min(4, strength)] + '</dd></div>' +
        '<div><dt>Graph capacity</dt><dd>' + domainItem.graph.nodes.length + ' skills across ' + (layout.maxDepth + 1) + ' tiers</dd></div>' +
        '<div><dt>Layout check</dt><dd>' + (overlapCount ? overlapCount + ' close node pairs' : 'No node collisions detected') + '</dd></div>' +
        '<div><dt>Current band</dt><dd>' + BAND_LABELS[domainItem.band] + '</dd></div>' +
      '</dl>' +
      '<div class="life-tree-inspector-skills">' + domainItem.skills.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join('') + '</div>' +
      '<p class="life-tree-inspector-note">This branch is generated by the same engine as every other subsystem. Add skills and prerequisites to its data; the tree recalculates its tiers and becomes denser within its fixed sector.</p>';
  }

  function padPhase(id) {
    return String(id).padStart(2, '0');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }
})();
