(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var LEVEL_LABELS = ['Dormant', 'Started', 'Learning complete', 'Applied strength', 'Evidence proven'];
  var BAND_LABELS = ['Foundations', 'Intern-ready scope', 'Junior-ready scope', 'Senior scope', 'Lead scope'];

  var domains = [
    {
      id: 'systems', title: 'Systems', x: 150, y: 540, band: 2,
      description: 'Understand operating systems, hardware boundaries, performance, networking and embedded constraints.',
      skills: ['Operating systems', 'Networking', 'Embedded systems'],
      path: 'M500 690 C435 676 344 638 170 550',
      twigs: [
        ['M340 632 C286 616 246 584 214 546', 205, 536],
        ['M292 612 C240 620 194 610 151 584', 141, 577],
        ['M242 590 C198 565 164 536 136 500', 128, 489],
        ['M386 654 C346 622 322 584 308 538', 305, 525]
      ]
    },
    {
      id: 'cyber', title: 'Cybersecurity', x: 235, y: 300, band: 3,
      description: 'Protect software, infrastructure and identities through secure design, testing and incident response.',
      skills: ['Application security', 'Identity', 'Threat modelling'],
      path: 'M494 660 C424 590 336 460 240 318',
      twigs: [
        ['M360 488 C306 458 270 420 244 372', 238, 359],
        ['M326 440 C286 396 278 350 282 302', 285, 288],
        ['M286 384 C242 362 211 331 188 294', 181, 281],
        ['M404 548 C370 500 362 454 366 412', 368, 398]
      ]
    },
    {
      id: 'cloud', title: 'Cloud & SRE', x: 365, y: 190, band: 3,
      description: 'Operate resilient services with automation, observability, infrastructure as code and reliability practices.',
      skills: ['Containers', 'Infrastructure as code', 'Observability'],
      path: 'M498 650 C464 536 420 368 370 214',
      twigs: [
        ['M426 392 C386 356 360 320 346 278', 343, 264],
        ['M405 326 C388 286 392 246 408 210', 414, 197],
        ['M449 474 C420 430 414 390 420 352', 424, 339],
        ['M388 275 C350 248 330 218 322 184', 319, 170]
      ]
    },
    {
      id: 'ai', title: 'Data & AI', x: 500, y: 132, band: 3,
      description: 'Build data systems, production machine-learning workflows, and AI-enabled products on shared engineering foundations.',
      skills: ['Python systems', 'Data pipelines', 'Model delivery'],
      path: 'M500 648 C500 518 500 332 500 154',
      twigs: [
        ['M500 434 C460 398 444 360 442 320', 442, 306],
        ['M500 366 C540 330 554 292 552 248', 553, 234],
        ['M500 286 C470 252 464 216 472 182', 476, 168],
        ['M500 520 C548 482 568 440 570 398', 571, 384]
      ]
    },
    {
      id: 'backend', title: 'Backend', x: 635, y: 190, band: 3,
      description: 'Design APIs, databases and distributed services that remain reliable as systems and teams grow.',
      skills: ['API design', 'Databases', 'Distributed systems'],
      path: 'M502 650 C536 536 580 368 630 214',
      twigs: [
        ['M574 392 C614 356 640 320 654 278', 657, 264],
        ['M595 326 C612 286 608 246 592 210', 586, 197],
        ['M551 474 C580 430 586 390 580 352', 576, 339],
        ['M612 275 C650 248 670 218 678 184', 681, 170]
      ]
    },
    {
      id: 'web', title: 'Web & Product', x: 765, y: 300, band: 2,
      description: 'Create accessible product interfaces, stateful applications and fast experiences for the web.',
      skills: ['Frontend systems', 'Accessibility', 'Performance'],
      path: 'M506 660 C576 590 664 460 760 318',
      twigs: [
        ['M640 488 C694 458 730 420 756 372', 762, 359],
        ['M674 440 C714 396 722 350 718 302', 715, 288],
        ['M714 384 C758 362 789 331 812 294', 819, 281],
        ['M596 548 C630 500 638 454 634 412', 632, 398]
      ]
    },
    {
      id: 'mobile', title: 'Mobile', x: 850, y: 540, band: 2,
      description: 'Ship native and cross-platform applications with resilient state, platform integration and polished interaction.',
      skills: ['Platform APIs', 'Offline state', 'Mobile delivery'],
      path: 'M500 690 C565 676 656 638 830 550',
      twigs: [
        ['M660 632 C714 616 754 584 786 546', 795, 536],
        ['M708 612 C760 620 806 610 849 584', 859, 577],
        ['M758 590 C802 565 836 536 864 500', 872, 489],
        ['M614 654 C654 622 678 584 692 538', 695, 525]
      ]
    },
    {
      id: 'game', title: 'Games & Graphics', x: 760, y: 720, band: 3,
      description: 'Build interactive simulations, rendering systems and real-time experiences under strict performance constraints.',
      skills: ['Game loops', 'Rendering', 'Real-time systems'],
      path: 'M515 724 C594 722 676 730 812 770',
      twigs: [
        ['M650 730 C696 704 735 680 770 646', 780, 636],
        ['M706 742 C756 734 798 736 838 750', 851, 754],
        ['M596 724 C632 694 648 660 654 626', 656, 612]
      ]
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
      'M500 840 C450 836 386 856 320 900',
      'M500 840 C548 840 620 864 690 910',
      'M500 830 C438 810 358 814 250 858',
      'M500 832 C564 812 650 814 754 858',
      'M500 820 C470 858 452 894 442 932',
      'M500 820 C530 858 548 894 558 932',
      'M492 824 C410 784 316 778 198 812',
      'M508 824 C590 784 684 778 802 812'
    ].forEach(function (path) { structure.appendChild(svgEl('path', { class: 'life-tree-root', d: path })); });
    [
      'M492 844 C478 786 482 726 500 650',
      'M508 844 C520 782 516 718 500 650',
      'M500 846 C500 778 500 718 500 648'
    ].forEach(function (path) { structure.appendChild(svgEl('path', { class: 'life-tree-trunk', d: path })); });
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
      group.appendChild(svgEl('path', { class: 'life-tree-hit', d: domain.path }));
      group.appendChild(svgEl('path', { class: 'life-tree-branch-line', d: domain.path }));
      domain.twigs.forEach(function (twig) {
        group.appendChild(svgEl('path', { class: 'life-tree-twig', d: twig[0] }));
        group.appendChild(leaf(twig[1], twig[2]));
      });
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

  function leaf(x, y) {
    return svgEl('path', {
      class: 'life-tree-leaf',
      d: 'M' + (x - 11) + ' ' + y + ' Q' + x + ' ' + (y - 15) + ' ' + (x + 11) + ' ' + y + ' Q' + x + ' ' + (y + 15) + ' ' + (x - 11) + ' ' + y + 'Z'
    });
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
