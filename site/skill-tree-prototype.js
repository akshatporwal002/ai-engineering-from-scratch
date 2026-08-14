(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var LEVEL_LABELS = ['Dormant', 'Started', 'Learning complete', 'Applied strength', 'Evidence proven'];
  var BAND_LABELS = ['Foundations', 'Intern-ready scope', 'Junior-ready scope', 'Senior scope', 'Lead scope'];

  var domains = [
    {
      id: 'systems', title: 'Systems', x: 145, y: 558, band: 2,
      description: 'Understand operating systems, hardware boundaries, performance, networking and embedded constraints.',
      skills: ['Operating systems', 'Networking', 'Embedded systems'],
      curve: [[486, 704], [410, 696], [270, 646], [160, 574]],
      width: 19,
      twigs: [[0.36, -1, 102], [0.55, 1, 82], [0.72, -1, 70], [0.84, 1, 58]]
    },
    {
      id: 'cyber', title: 'Cybersecurity', x: 224, y: 322, band: 3,
      description: 'Protect software, infrastructure and identities through secure design, testing and incident response.',
      skills: ['Application security', 'Identity', 'Threat modelling'],
      curve: [[489, 622], [406, 584], [304, 462], [232, 340]],
      width: 17,
      twigs: [[0.30, -1, 96], [0.48, 1, 76], [0.66, -1, 76], [0.82, 1, 58]]
    },
    {
      id: 'cloud', title: 'Cloud & SRE', x: 354, y: 186, band: 3,
      description: 'Operate resilient services with automation, observability, infrastructure as code and reliability practices.',
      skills: ['Containers', 'Infrastructure as code', 'Observability'],
      curve: [[494, 548], [454, 472], [405, 310], [362, 208]],
      width: 15,
      twigs: [[0.29, -1, 88], [0.48, 1, 72], [0.68, -1, 66], [0.82, 1, 50]]
    },
    {
      id: 'ai', title: 'Data & AI', x: 500, y: 112, band: 3,
      description: 'Build data systems, production machine-learning workflows, and AI-enabled products on shared engineering foundations.',
      skills: ['Python systems', 'Data pipelines', 'Model delivery'],
      curve: [[500, 456], [486, 366], [510, 220], [500, 136]],
      width: 15,
      twigs: [[0.24, -1, 90], [0.42, 1, 86], [0.61, -1, 74], [0.78, 1, 56]]
    },
    {
      id: 'backend', title: 'Backend', x: 646, y: 186, band: 3,
      description: 'Design APIs, databases and distributed services that remain reliable as systems and teams grow.',
      skills: ['API design', 'Databases', 'Distributed systems'],
      curve: [[506, 548], [546, 472], [595, 310], [638, 208]],
      width: 15,
      twigs: [[0.29, 1, 88], [0.48, -1, 72], [0.68, 1, 66], [0.82, -1, 50]]
    },
    {
      id: 'web', title: 'Web & Product', x: 776, y: 322, band: 2,
      description: 'Create accessible product interfaces, stateful applications and fast experiences for the web.',
      skills: ['Frontend systems', 'Accessibility', 'Performance'],
      curve: [[511, 622], [594, 584], [696, 462], [768, 340]],
      width: 17,
      twigs: [[0.30, 1, 96], [0.48, -1, 76], [0.66, 1, 76], [0.82, -1, 58]]
    },
    {
      id: 'mobile', title: 'Mobile', x: 855, y: 558, band: 2,
      description: 'Ship native and cross-platform applications with resilient state, platform integration and polished interaction.',
      skills: ['Platform APIs', 'Offline state', 'Mobile delivery'],
      curve: [[514, 704], [590, 696], [730, 646], [840, 574]],
      width: 19,
      twigs: [[0.36, 1, 102], [0.55, -1, 82], [0.72, 1, 70], [0.84, -1, 58]]
    },
    {
      id: 'game', title: 'Games & Graphics', x: 770, y: 750, band: 3,
      description: 'Build interactive simulations, rendering systems and real-time experiences under strict performance constraints.',
      skills: ['Game loops', 'Rendering', 'Real-time systems'],
      curve: [[515, 770], [602, 742], [704, 758], [824, 790]],
      width: 18,
      twigs: [[0.34, -1, 88], [0.57, -1, 72], [0.76, 1, 60]]
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
      [[[500, 836], [442, 814], [350, 818], [216, 868]], 22],
      [[[500, 836], [558, 814], [650, 818], [784, 868]], 22],
      [[[500, 840], [452, 850], [392, 880], [328, 924]], 18],
      [[[500, 840], [548, 850], [608, 880], [672, 924]], 18],
      [[[494, 842], [462, 876], [446, 910], [438, 948]], 15],
      [[[506, 842], [538, 876], [554, 910], [562, 948]], 15]
    ].forEach(function (root) {
      structure.appendChild(svgEl('path', {
        class: 'life-tree-root life-tree-wood-shape',
        d: taperedPath(root[0], root[1], 1.2, 22)
      }));
    });
    structure.appendChild(svgEl('path', {
      class: 'life-tree-trunk life-tree-wood-shape',
      d: taperedPath([[500, 848], [476, 742], [502, 560], [500, 408]], 34, 8, 34)
    }));
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
      group.appendChild(svgEl('path', {
        class: 'life-tree-branch-shape life-tree-wood-shape',
        d: taperedPath(domain.curve, domain.width, 1.7, 32)
      }));
      domain.twigs.forEach(function (twig, twigIndex) {
        var twigCurve = makeTwigCurve(domain.curve, twig[0], twig[1], twig[2], twigIndex);
        group.appendChild(svgEl('path', {
          class: 'life-tree-twig-shape life-tree-wood-shape',
          d: taperedPath(twigCurve, Math.max(5, domain.width * 0.36), 0.8, 20)
        }));
        group.appendChild(leaf(twigCurve[3][0], twigCurve[3][1], twigCurve));
      });
      group.appendChild(leaf(domain.curve[3][0], domain.curve[3][1], domain.curve));
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
    svg.appendChild(structure);
  }

  function leaf(x, y, curve) {
    var tangent = cubicDerivative(curve, 1);
    var angle = Math.atan2(tangent.y, tangent.x) * 180 / Math.PI;
    return svgEl('path', {
      class: 'life-tree-leaf',
      d: 'M' + (x - 2) + ' ' + y + ' C' + (x + 7) + ' ' + (y - 12) + ' ' + (x + 18) + ' ' + (y - 10) + ' ' + (x + 22) + ' ' + y + ' C' + (x + 14) + ' ' + (y + 10) + ' ' + (x + 5) + ' ' + (y + 9) + ' ' + (x - 2) + ' ' + y + 'Z',
      transform: 'rotate(' + angle + ' ' + x + ' ' + y + ')'
    });
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

  function taperedPath(curve, startWidth, endWidth, steps) {
    var left = [];
    var right = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var point = cubicPoint(curve, t);
      var tangent = cubicDerivative(curve, t);
      var length = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1;
      var width = (startWidth * Math.pow(1 - t, 1.2) + endWidth * t) / 2;
      var nx = -tangent.y / length;
      var ny = tangent.x / length;
      left.push([point.x + nx * width, point.y + ny * width]);
      right.push([point.x - nx * width, point.y - ny * width]);
    }
    var path = 'M' + left[0][0].toFixed(2) + ' ' + left[0][1].toFixed(2);
    for (var j = 1; j < left.length; j++) path += ' L' + left[j][0].toFixed(2) + ' ' + left[j][1].toFixed(2);
    for (var k = right.length - 1; k >= 0; k--) path += ' L' + right[k][0].toFixed(2) + ' ' + right[k][1].toFixed(2);
    return path + ' Z';
  }

  function makeTwigCurve(parentCurve, t, side, length, index) {
    var start = cubicPoint(parentCurve, t);
    var tangent = cubicDerivative(parentCurve, t);
    var magnitude = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y) || 1;
    var tx = tangent.x / magnitude;
    var ty = tangent.y / magnitude;
    var nx = -ty * side;
    var ny = tx * side;
    var sweep = length * (0.72 + index * 0.025);
    return [
      [start.x, start.y],
      [start.x + tx * length * 0.28 + nx * length * 0.04, start.y + ty * length * 0.28 + ny * length * 0.04],
      [start.x + tx * length * 0.52 + nx * length * 0.48, start.y + ty * length * 0.52 + ny * length * 0.48],
      [start.x + tx * length * 0.58 + nx * sweep, start.y + ty * length * 0.58 + ny * sweep]
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
