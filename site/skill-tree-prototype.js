(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var LEVEL_LABELS = ['Dormant', 'Started', 'Learning complete', 'Applied strength', 'Evidence proven'];
  var BAND_LABELS = ['Foundations', 'Intern-ready scope', 'Junior-ready scope', 'Senior scope', 'Lead scope'];

  var domains = [
    {
      id: 'systems', title: 'Systems', x: 120, y: 558, band: 2,
      description: 'Understand operating systems, hardware boundaries, performance, networking and embedded constraints.',
      skills: ['Operating systems', 'Networking', 'Embedded systems'],
      curve: [[500, 650], [420, 650], [260, 620], [140, 575]],
      twigs: [[0.42, 300, 530], [0.67, 185, 520], [0.78, 130, 635]]
    },
    {
      id: 'cyber', title: 'Cybersecurity', x: 190, y: 318, band: 3,
      description: 'Protect software, infrastructure and identities through secure design, testing and incident response.',
      skills: ['Application security', 'Identity', 'Threat modelling'],
      curve: [[500, 530], [420, 520], [300, 425], [210, 340]],
      twigs: [[0.40, 330, 350], [0.64, 180, 410], [0.78, 245, 285]]
    },
    {
      id: 'cloud', title: 'Cloud & SRE', x: 335, y: 150, band: 3,
      description: 'Operate resilient services with automation, observability, infrastructure as code and reliability practices.',
      skills: ['Containers', 'Infrastructure as code', 'Observability'],
      curve: [[500, 410], [458, 355], [405, 250], [350, 175]],
      twigs: [[0.38, 410, 210], [0.63, 300, 245], [0.79, 320, 115]]
    },
    {
      id: 'ai', title: 'Data & AI', x: 500, y: 30, band: 3,
      description: 'Build data systems, production machine-learning workflows, and AI-enabled products on shared engineering foundations.',
      skills: ['Python systems', 'Data pipelines', 'Model delivery'],
      curve: [[500, 410], [500, 402], [500, 394], [500, 386]],
      twigs: []
    },
    {
      id: 'backend', title: 'Backend', x: 665, y: 150, band: 3,
      description: 'Design APIs, databases and distributed services that remain reliable as systems and teams grow.',
      skills: ['API design', 'Databases', 'Distributed systems'],
      curve: [[500, 410], [542, 355], [595, 250], [650, 175]],
      twigs: [[0.38, 590, 210], [0.63, 700, 245], [0.79, 680, 115]]
    },
    {
      id: 'web', title: 'Web & Product', x: 810, y: 318, band: 2,
      description: 'Create accessible product interfaces, stateful applications and fast experiences for the web.',
      skills: ['Frontend systems', 'Accessibility', 'Performance'],
      curve: [[500, 530], [580, 520], [700, 425], [790, 340]],
      twigs: [[0.40, 670, 350], [0.64, 820, 410], [0.78, 755, 285]]
    },
    {
      id: 'mobile', title: 'Mobile', x: 880, y: 558, band: 2,
      description: 'Ship native and cross-platform applications with resilient state, platform integration and polished interaction.',
      skills: ['Platform APIs', 'Offline state', 'Mobile delivery'],
      curve: [[500, 650], [580, 650], [740, 620], [860, 575]],
      twigs: [[0.42, 700, 530], [0.67, 815, 520], [0.78, 870, 635]]
    },
    {
      id: 'game', title: 'Games & Graphics', x: 790, y: 770, band: 3,
      description: 'Build interactive simulations, rendering systems and real-time experiences under strict performance constraints.',
      skills: ['Game loops', 'Rendering', 'Real-time systems'],
      curve: [[500, 740], [610, 700], [705, 720], [825, 780]],
      twigs: [[0.35, 650, 650], [0.58, 760, 660], [0.76, 850, 720]]
    }
  ];

  var svg;
  var inspector;
  var aiRoadmap = [];
  var aiLayout = {};
  var aiPhaseLayer;
  var selectedId = 'ai';
  var selectedAiPhaseId = null;
  var previewLevel = 2;

  document.addEventListener('DOMContentLoaded', init);

  function svgEl(tag, attrs) {
    var element = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (name) { element.setAttribute(name, attrs[name]); });
    return element;
  }

  function init() {
    svg = document.getElementById('lifeTreeGraph');
    inspector = document.getElementById('lifeTreeInspector');
    if (!svg || !inspector) return;
    prepareAiRoadmap();
    renderTree();
    bindControls();
    updateTree();
    centerTreeViewport();
    window.addEventListener('resize', centerTreeViewport);
  }

  function renderTree() {
    var rings = svgEl('g', { 'aria-hidden': 'true' });
    rings.appendChild(svgEl('circle', { class: 'life-tree-boundary', cx: 500, cy: 500, r: 455 }));
    [150, 250, 350].forEach(function (radius) {
      rings.appendChild(svgEl('circle', { class: 'life-tree-ring', cx: 500, cy: 555, r: radius }));
    });
    svg.appendChild(rings);

    var structure = svgEl('g', { class: 'life-tree-structure', 'data-strength': '0', 'aria-hidden': 'true' });
    [
      [[500, 850], [420, 835], [315, 855], [205, 900]],
      [[500, 850], [580, 835], [685, 855], [795, 900]]
    ].forEach(function (rootCurve) {
      structure.appendChild(svgEl('path', { class: 'life-tree-root', d: centerlinePath(rootCurve) }));
    });
    structure.appendChild(svgEl('path', {
      class: 'life-tree-trunk',
      d: 'M500 852 C500 720 500 530 500 360'
    }));
    svg.appendChild(structure);
    domains.forEach(function (domain, index) {
      var group = svgEl('g', {
        class: 'life-tree-domain' + (domain.id === selectedId ? ' is-selected' : ''),
        'data-domain': domain.id,
        'data-index': index,
        'data-strength': '0',
        tabindex: domain.id === selectedId ? '0' : '-1',
        role: 'button',
        'aria-pressed': domain.id === selectedId ? 'true' : 'false',
        'aria-label': domain.title + ' branch'
      });
      group.appendChild(svgEl('path', { class: 'life-tree-hit', d: centerlinePath(domain.curve) }));
      group.appendChild(svgEl('path', { class: 'life-tree-branch-line', d: centerlinePath(domain.curve) }));
      domain.twigs.forEach(function (twig, twigIndex) {
        var twigCurve = makeTwigCurve(domain.curve, twig[0], [twig[1], twig[2]], twigIndex);
        group.appendChild(svgEl('path', { class: 'life-tree-twig', d: centerlinePath(twigCurve) }));
        group.appendChild(node(twig[1], twig[2], false));
      });
      if (domain.id !== 'ai') group.appendChild(node(domain.curve[3][0], domain.curve[3][1], true));
      var label = svgEl('text', { class: 'life-tree-domain-label', x: domain.x, y: domain.y });
      label.textContent = domain.title;
      group.appendChild(label);
      if (domain.id === 'ai' && aiRoadmap.length) {
        var countLabel = svgEl('text', { class: 'life-tree-domain-count', x: domain.x, y: domain.y + 20 });
        countLabel.textContent = aiRoadmap.length + ' phases · ' + aiLessonCount() + ' lessons';
        group.appendChild(countLabel);
      }
      group.addEventListener('click', function () { selectDomain(domain.id, true); });
      group.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectDomain(domain.id, true);
          return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') moveFocus(index, -1);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') moveFocus(index, 1);
      });
      svg.appendChild(group);
    });
    renderAiRoadmap();
  }

  function node(x, y, isPrimary) {
    return svgEl('circle', {
      class: 'life-tree-node' + (isPrimary ? ' is-primary' : ''),
      cx: x,
      cy: y,
      r: isPrimary ? 8 : 6
    });
  }

  function prepareAiRoadmap() {
    aiRoadmap = typeof PHASES !== 'undefined' && Array.isArray(PHASES)
      ? PHASES.slice().sort(function (a, b) { return a.id - b.id; })
      : [];
    aiLayout = buildAiLayout(aiRoadmap);
  }

  function aiLessonCount() {
    return aiRoadmap.reduce(function (total, phase) {
      return total + (Array.isArray(phase.lessons) ? phase.lessons.length : 0);
    }, 0);
  }

  function buildAiLayout(phases) {
    var layout = {};
    if (!phases.length) return layout;
    var phaseById = {};
    var children = {};
    var parentById = {};
    phases.forEach(function (phase) {
      phaseById[phase.id] = phase;
      children[phase.id] = [];
    });
    phases.forEach(function (phase) {
      var prereqs = typeof ROADMAP_PREREQS !== 'undefined' && ROADMAP_PREREQS[phase.id]
        ? ROADMAP_PREREQS[phase.id]
        : [];
      var primaryParent = prereqs.find(function (id) { return phaseById[id]; });
      if (primaryParent !== undefined) {
        parentById[phase.id] = primaryParent;
        children[primaryParent].push(phase.id);
      }
    });
    Object.keys(children).forEach(function (id) {
      children[id].sort(function (a, b) { return a - b; });
    });

    var roots = phases.filter(function (phase) { return parentById[phase.id] === undefined; }).map(function (phase) { return phase.id; });
    var depthById = {};
    var maxDepth = 0;
    function setDepth(id, depth) {
      depthById[id] = depth;
      maxDepth = Math.max(maxDepth, depth);
      children[id].forEach(function (childId) { setDepth(childId, depth + 1); });
    }
    roots.forEach(function (id) { setDepth(id, 0); });

    var leaves = [];
    function collectLeaves(id) {
      if (!children[id].length) {
        leaves.push(id);
        return;
      }
      children[id].forEach(collectLeaves);
    }
    roots.forEach(collectLeaves);
    var minAngle = -116;
    var maxAngle = -64;
    var angleById = {};
    leaves.forEach(function (id, index) {
      angleById[id] = leaves.length === 1
        ? -90
        : minAngle + (maxAngle - minAngle) * index / (leaves.length - 1);
    });
    function assignInternalAngle(id) {
      if (angleById[id] !== undefined) return angleById[id];
      var childAngles = children[id].map(assignInternalAngle);
      angleById[id] = childAngles.reduce(function (sum, angle) { return sum + angle; }, 0) / childAngles.length;
      return angleById[id];
    }
    roots.forEach(assignInternalAngle);

    var anchor = { x: 500, y: 410 };
    phases.forEach(function (phase) {
      var angle = angleById[phase.id] === undefined ? -90 : angleById[phase.id];
      var radians = angle * Math.PI / 180;
      var direction = { x: Math.cos(radians), y: Math.sin(radians) };
      var boundary = distanceToCircleEdge(anchor, direction, 441);
      var isLeaf = children[phase.id].length === 0;
      var depthRatio = depthById[phase.id] / Math.max(1, maxDepth);
      var densityRadius = isLeaf ? 0.985 : 0.08 + 0.69 * Math.pow(depthRatio, 0.72);
      var distance = Math.max(24, boundary * densityRadius);
      var point = capToCircle({
        x: anchor.x + direction.x * distance,
        y: anchor.y + direction.y * distance
      }, 441);
      layout[phase.id] = {
        angle: angle,
        children: children[phase.id],
        depth: depthById[phase.id],
        parentId: parentById[phase.id],
        point: point,
        isLeaf: isLeaf
      };
    });
    layout.anchor = anchor;
    layout.maxDepth = maxDepth;
    return layout;
  }

  function distanceToCircleEdge(origin, direction, radius) {
    var cx = origin.x - 500;
    var cy = origin.y - 500;
    var projection = cx * direction.x + cy * direction.y;
    var discriminant = projection * projection - (cx * cx + cy * cy - radius * radius);
    return -projection + Math.sqrt(Math.max(0, discriminant));
  }

  function capToCircle(point, radius) {
    var dx = point.x - 500;
    var dy = point.y - 500;
    var distance = Math.sqrt(dx * dx + dy * dy) || 1;
    if (distance <= radius) return point;
    return { x: 500 + dx / distance * radius, y: 500 + dy / distance * radius };
  }

  function renderAiRoadmap() {
    if (!aiRoadmap.length || !aiLayout.anchor) return;
    aiPhaseLayer = svgEl('g', {
      class: 'life-tree-ai-roadmap',
      'data-strength': '0',
      role: 'group',
      'aria-label': 'AI and machine learning pathway with ' + aiRoadmap.length + ' phases and ' + aiLessonCount() + ' lessons'
    });
    var edges = svgEl('g', { class: 'life-tree-ai-edges', 'aria-hidden': 'true' });
    aiRoadmap.forEach(function (phase) {
      var item = aiLayout[phase.id];
      var parent = item.parentId === undefined ? aiLayout.anchor : aiLayout[item.parentId].point;
      var parentAngle = item.parentId === undefined ? item.angle : aiLayout[item.parentId].angle;
      edges.appendChild(svgEl('path', {
        class: 'life-tree-ai-edge',
        d: centerlinePath(aiEdgeCurve(parent, item.point, parentAngle, item.angle))
      }));
    });
    aiPhaseLayer.appendChild(edges);

    aiRoadmap.forEach(function (phase, index) {
      var item = aiLayout[phase.id];
      var lessonCount = Array.isArray(phase.lessons) ? phase.lessons.length : 0;
      var group = svgEl('g', {
        class: 'life-tree-ai-phase',
        'data-phase-id': phase.id,
        tabindex: phase.id === selectedAiPhaseId ? '0' : '-1',
        role: 'button',
        'aria-pressed': phase.id === selectedAiPhaseId ? 'true' : 'false',
        'aria-label': 'Phase ' + padPhase(phase.id) + ': ' + phase.name + '. ' + lessonCount + ' lessons.'
      });
      var title = svgEl('title');
      title.textContent = 'Phase ' + padPhase(phase.id) + ' · ' + phase.name + ' · ' + lessonCount + ' lessons';
      group.appendChild(title);
      group.appendChild(svgEl('circle', {
        class: 'life-tree-ai-phase-hit',
        cx: item.point.x,
        cy: item.point.y,
        r: 15
      }));
      group.appendChild(svgEl('circle', {
        class: 'life-tree-ai-phase-node' + (item.isLeaf ? ' is-terminal' : ''),
        cx: item.point.x,
        cy: item.point.y,
        r: Math.min(7.5, 4.2 + Math.sqrt(lessonCount) * 0.32)
      }));
      var code = svgEl('text', {
        class: 'life-tree-ai-phase-code',
        x: item.point.x,
        y: item.point.y - 10
      });
      code.textContent = padPhase(phase.id);
      group.appendChild(code);
      group.addEventListener('click', function (event) {
        event.stopPropagation();
        selectAiPhase(phase.id, true);
      });
      group.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectAiPhase(phase.id, true);
          return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') moveAiPhaseFocus(index, -1);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') moveAiPhaseFocus(index, 1);
      });
      aiPhaseLayer.appendChild(group);
    });
    svg.appendChild(aiPhaseLayer);
  }

  function aiEdgeCurve(start, end, startAngle, endAngle) {
    var distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    var lead = Math.min(52, distance * 0.34);
    var startRadians = startAngle * Math.PI / 180;
    var endRadians = endAngle * Math.PI / 180;
    return [
      [start.x, start.y],
      [start.x + Math.cos(startRadians) * lead, start.y + Math.sin(startRadians) * lead],
      [end.x - Math.cos(endRadians) * lead, end.y - Math.sin(endRadians) * lead],
      [end.x, end.y]
    ];
  }

  function padPhase(id) {
    return String(id).padStart(2, '0');
  }

  function centerTreeViewport() {
    if (!svg || window.innerWidth > 760) return;
    var stage = svg.parentElement;
    if (!stage) return;
    stage.scrollLeft = Math.max(0, (svg.scrollWidth - stage.clientWidth) / 2);
  }

  function centerlinePath(curve) {
    return 'M' + curve[0][0] + ' ' + curve[0][1] +
      ' C' + curve[1][0] + ' ' + curve[1][1] +
      ' ' + curve[2][0] + ' ' + curve[2][1] +
      ' ' + curve[3][0] + ' ' + curve[3][1];
  }

  function cubicPoint(curve, t) {
    var mt = 1 - t;
    return {
      x: mt * mt * mt * curve[0][0] + 3 * mt * mt * t * curve[1][0] + 3 * mt * t * t * curve[2][0] + t * t * t * curve[3][0],
      y: mt * mt * mt * curve[0][1] + 3 * mt * mt * t * curve[1][1] + 3 * mt * t * t * curve[2][1] + t * t * t * curve[3][1]
    };
  }

  function cubicDerivative(curve, t) {
    var mt = 1 - t;
    return {
      x: 3 * mt * mt * (curve[1][0] - curve[0][0]) + 6 * mt * t * (curve[2][0] - curve[1][0]) + 3 * t * t * (curve[3][0] - curve[2][0]),
      y: 3 * mt * mt * (curve[1][1] - curve[0][1]) + 6 * mt * t * (curve[2][1] - curve[1][1]) + 3 * t * t * (curve[3][1] - curve[2][1])
    };
  }

  function makeTwigCurve(parentCurve, t, end, index) {
    var start = cubicPoint(parentCurve, t);
    var tangent = cubicDerivative(parentCurve, t);
    var magnitude = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1;
    var tx = tangent.x / magnitude;
    var ty = tangent.y / magnitude;
    var dx = end[0] - start.x;
    var dy = end[1] - start.y;
    var distance = Math.sqrt(dx * dx + dy * dy) || 1;
    var approachX = dx / distance;
    var approachY = dy / distance;
    var lead = Math.min(64, distance * (0.28 + index * 0.015));
    return [
      [start.x, start.y],
      [start.x + tx * lead, start.y + ty * lead],
      [end[0] - approachX * lead, end[1] - approachY * lead],
      [end[0], end[1]]
    ];
  }

  function bindControls() {
    var buttons = document.querySelectorAll('[data-tree-level]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (event) {
        previewLevel = parseInt(event.currentTarget.getAttribute('data-tree-level'), 10);
        for (var j = 0; j < buttons.length; j++) {
          buttons[j].setAttribute('aria-pressed', buttons[j] === event.currentTarget ? 'true' : 'false');
        }
        updateTree();
      });
    }
  }

  function selectDomain(id, shouldFocus, preserveAiPhase) {
    selectedId = id;
    if (!preserveAiPhase) selectedAiPhaseId = null;
    var groups = svg.querySelectorAll('.life-tree-domain');
    for (var i = 0; i < groups.length; i++) {
      var selected = groups[i].getAttribute('data-domain') === id;
      groups[i].classList.toggle('is-selected', selected);
      groups[i].setAttribute('aria-pressed', selected ? 'true' : 'false');
      groups[i].setAttribute('tabindex', selected ? '0' : '-1');
      if (selected && shouldFocus) groups[i].focus();
    }
    updateAiPhaseSelection(false);
    updateTree();
  }

  function moveFocus(index, direction) {
    var next = (index + direction + domains.length) % domains.length;
    selectDomain(domains[next].id, true);
  }

  function selectAiPhase(id, shouldFocus) {
    selectedAiPhaseId = id;
    selectDomain('ai', false, true);
    updateAiPhaseSelection(shouldFocus);
  }

  function moveAiPhaseFocus(index, direction) {
    var next = (index + direction + aiRoadmap.length) % aiRoadmap.length;
    selectAiPhase(aiRoadmap[next].id, true);
  }

  function updateAiPhaseSelection(shouldFocus) {
    if (!aiPhaseLayer) return;
    var phaseGroups = aiPhaseLayer.querySelectorAll('.life-tree-ai-phase');
    for (var i = 0; i < phaseGroups.length; i++) {
      var selected = Number(phaseGroups[i].getAttribute('data-phase-id')) === selectedAiPhaseId;
      phaseGroups[i].classList.toggle('is-selected', selected);
      phaseGroups[i].setAttribute('aria-pressed', selected ? 'true' : 'false');
      phaseGroups[i].setAttribute('tabindex', selected ? '0' : '-1');
      if (selected && shouldFocus) phaseGroups[i].focus();
    }
  }

  function strengthFor(index, selectedIndex) {
    if (previewLevel === 0) return 0;
    if (index === selectedIndex) return Math.min(4, previewLevel + 1);
    var distance = Math.min(Math.abs(index - selectedIndex), domains.length - Math.abs(index - selectedIndex));
    if (distance === 1) return Math.max(0, previewLevel - 1);
    return previewLevel === 3 ? 1 : 0;
  }

  function updateTree() {
    var selectedIndex = domains.findIndex(function (domain) { return domain.id === selectedId; });
    var groups = svg.querySelectorAll('.life-tree-domain');
    for (var i = 0; i < groups.length; i++) {
      groups[i].setAttribute('data-strength', String(strengthFor(i, selectedIndex)));
    }
    var aiIndex = domains.findIndex(function (domain) { return domain.id === 'ai'; });
    if (aiPhaseLayer) aiPhaseLayer.setAttribute('data-strength', String(strengthFor(aiIndex, selectedIndex)));
    updateAiPhaseSelection(false);
    var structure = svg.querySelector('.life-tree-structure');
    if (structure) structure.setAttribute('data-strength', String(previewLevel === 0 ? 0 : Math.min(4, previewLevel + 1)));
    if (selectedId === 'ai' && selectedAiPhaseId !== null) {
      renderAiPhaseInspector(selectedAiPhaseId, strengthFor(selectedIndex, selectedIndex));
    } else {
      renderInspector(domains[selectedIndex], strengthFor(selectedIndex, selectedIndex));
    }
  }

  function renderAiPhaseInspector(phaseId, strength) {
    var phase = aiRoadmap.find(function (item) { return item.id === phaseId; });
    if (!phase) return;
    var prereqIds = typeof ROADMAP_PREREQS !== 'undefined' && ROADMAP_PREREQS[phaseId] ? ROADMAP_PREREQS[phaseId] : [];
    var prereqNames = prereqIds.map(function (id) {
      var prereq = aiRoadmap.find(function (item) { return item.id === id; });
      return prereq ? prereq.name : 'Phase ' + padPhase(id);
    });
    var lessons = Array.isArray(phase.lessons) ? phase.lessons : [];
    var firstLessonPath = lessons.length ? localLessonPath(lessons[0].url) : '';
    inspector.innerHTML =
      '<span class="life-tree-inspector-kicker">AI / ML pathway · Phase ' + padPhase(phase.id) + '</span>' +
      '<h3>' + escapeHtml(phase.name) + '</h3>' +
      '<p>' + escapeHtml(phase.desc || 'A phase in the imported AI Engineering from Scratch pathway.') + '</p>' +
      '<dl>' +
        '<div><dt>Learning density</dt><dd>' + lessons.length + ' lessons in this branch</dd></div>' +
        '<div><dt>Prerequisites</dt><dd>' + (prereqNames.length ? escapeHtml(prereqNames.join(', ')) : 'Starting phase') + '</dd></div>' +
        '<div><dt>Preview light</dt><dd>Level ' + strength + ' · ' + LEVEL_LABELS[strength] + '</dd></div>' +
      '</dl>' +
      '<div class="life-tree-inspector-skills" aria-label="Example lessons">' +
        lessons.slice(0, 3).map(function (lesson) { return '<span>' + escapeHtml(lesson.name) + '</span>'; }).join('') +
      '</div>' +
      (firstLessonPath ? '<a class="life-tree-inspector-link" href="lesson.html?path=' + encodeURIComponent(firstLessonPath) + '">Open first lesson</a>' : '') +
      '<p class="life-tree-inspector-note">All ' + aiRoadmap.length + ' original phases are mapped here. New phases are placed automatically and make this canopy denser without crossing the circle boundary.</p>';
  }

  function localLessonPath(url) {
    var match = String(url || '').match(/\/phases\/([^?#]+?)\/?$/);
    return match ? 'phases/' + match[1] : '';
  }

  function renderInspector(domain, strength) {
    var supporting = domains
      .filter(function (_, index) { return strengthFor(index, domains.indexOf(domain)) > 0 && domains[index].id !== domain.id; })
      .map(function (item) { return item.title; });
    inspector.innerHTML =
      '<span class="life-tree-inspector-kicker">Selected branch</span>' +
      '<h3>' + escapeHtml(domain.title) + '</h3>' +
      '<p>' + escapeHtml(domain.description) + '</p>' +
      '<dl>' +
        '<div><dt>Direct light</dt><dd>Level ' + strength + ' · ' + LEVEL_LABELS[strength] + '</dd></div>' +
        '<div><dt>Ambient strength</dt><dd>' + (supporting.length ? 'Reinforced by ' + escapeHtml(supporting.join(', ')) : 'No related glow yet') + '</dd></div>' +
        '<div><dt>Current band</dt><dd>' + BAND_LABELS[domain.band] + '</dd></div>' +
      '</dl>' +
      '<div class="life-tree-inspector-skills" aria-label="Example skills">' +
        domain.skills.map(function (skill) { return '<span>' + escapeHtml(skill) + '</span>'; }).join('') +
      '</div>' +
      '<p class="life-tree-inspector-note">Direct light comes from work in this branch. Nearby glow shows supporting knowledge without marking this branch complete.</p>';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }
})();
