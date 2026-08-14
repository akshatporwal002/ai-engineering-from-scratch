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
      id: 'ai', title: 'Data & AI', x: 500, y: 68, band: 3,
      description: 'Build data systems, production machine-learning workflows, and AI-enabled products on shared engineering foundations.',
      skills: ['Python systems', 'Data pipelines', 'Model delivery'],
      curve: [[500, 360], [500, 290], [500, 175], [500, 95]],
      twigs: [[0.38, 440, 205], [0.58, 560, 175], [0.76, 448, 125]]
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
  var selectedId = 'ai';
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
      group.appendChild(node(domain.curve[3][0], domain.curve[3][1], true));
      var label = svgEl('text', { class: 'life-tree-domain-label', x: domain.x, y: domain.y });
      label.textContent = domain.title;
      group.appendChild(label);
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
  }

  function node(x, y, isPrimary) {
    return svgEl('circle', {
      class: 'life-tree-node' + (isPrimary ? ' is-primary' : ''),
      cx: x,
      cy: y,
      r: isPrimary ? 8 : 6
    });
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

  function selectDomain(id, shouldFocus) {
    selectedId = id;
    var groups = svg.querySelectorAll('.life-tree-domain');
    for (var i = 0; i < groups.length; i++) {
      var selected = groups[i].getAttribute('data-domain') === id;
      groups[i].classList.toggle('is-selected', selected);
      groups[i].setAttribute('aria-pressed', selected ? 'true' : 'false');
      groups[i].setAttribute('tabindex', selected ? '0' : '-1');
      if (selected && shouldFocus) groups[i].focus();
    }
    updateTree();
  }

  function moveFocus(index, direction) {
    var next = (index + direction + domains.length) % domains.length;
    selectDomain(domains[next].id, true);
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
    var structure = svg.querySelector('.life-tree-structure');
    if (structure) structure.setAttribute('data-strength', String(previewLevel === 0 ? 0 : Math.min(4, previewLevel + 1)));
    renderInspector(domains[selectedIndex], strengthFor(selectedIndex, selectedIndex));
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
