(function () {
  'use strict';

  var DEFAULT_CENTER = { x: 500, y: 500 };

  function asId(value) {
    return String(value);
  }

  function compareIds(left, right) {
    return asId(left).localeCompare(asId(right), undefined, { numeric: true });
  }

  function validateGraph(graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return false;
    var ids = {};
    for (var i = 0; i < graph.nodes.length; i++) {
      var id = asId(graph.nodes[i].id);
      if (ids[id]) return false;
      ids[id] = true;
    }
    for (var j = 0; j < graph.edges.length; j++) {
      if (!ids[asId(graph.edges[j].from)] || !ids[asId(graph.edges[j].to)]) return false;
    }
    return true;
  }

  function buildLookups(graph) {
    var nodeById = {};
    var parents = {};
    var children = {};
    graph.nodes.forEach(function (node) {
      var id = asId(node.id);
      nodeById[id] = node;
      parents[id] = [];
      children[id] = [];
    });
    graph.edges.forEach(function (edge) {
      var from = asId(edge.from);
      var to = asId(edge.to);
      parents[to].push(from);
      children[from].push(to);
    });
    Object.keys(parents).forEach(function (id) {
      parents[id].sort(compareIds);
      children[id].sort(compareIds);
    });
    return { nodeById: nodeById, parents: parents, children: children };
  }

  function assignDepths(graph, lookups) {
    var indegree = {};
    var depth = {};
    var queue = [];
    graph.nodes.forEach(function (node) {
      var id = asId(node.id);
      indegree[id] = lookups.parents[id].length;
      depth[id] = 0;
      if (indegree[id] === 0) queue.push(id);
    });
    queue.sort(compareIds);
    var visited = 0;
    while (queue.length) {
      var id = queue.shift();
      visited += 1;
      lookups.children[id].forEach(function (childId) {
        depth[childId] = Math.max(depth[childId], depth[id] + 1);
        indegree[childId] -= 1;
        if (indegree[childId] === 0) {
          queue.push(childId);
          queue.sort(compareIds);
        }
      });
    }
    return visited === graph.nodes.length ? depth : null;
  }

  function orderTiers(tiers, lookups) {
    var order = {};
    for (var pass = 0; pass < 4; pass++) {
      for (var tierIndex = 0; tierIndex < tiers.length; tierIndex++) {
        tiers[tierIndex].sort(function (left, right) {
          var leftParents = lookups.parents[left];
          var rightParents = lookups.parents[right];
          var leftScore = leftParents.length
            ? leftParents.reduce(function (sum, id) { return sum + (order[id] || 0); }, 0) / leftParents.length
            : 0;
          var rightScore = rightParents.length
            ? rightParents.reduce(function (sum, id) { return sum + (order[id] || 0); }, 0) / rightParents.length
            : 0;
          return leftScore - rightScore || compareIds(left, right);
        });
        tiers[tierIndex].forEach(function (id, index) { order[id] = index; });
      }
    }
    return tiers;
  }

  function polarPoint(center, radius, angle) {
    var radians = angle * Math.PI / 180;
    return {
      x: center.x + Math.cos(radians) * radius,
      y: center.y + Math.sin(radians) * radius
    };
  }

  function capToCircle(point, center, radius) {
    var dx = point.x - center.x;
    var dy = point.y - center.y;
    var distance = Math.sqrt(dx * dx + dy * dy) || 1;
    if (distance <= radius) return point;
    return {
      x: center.x + dx / distance * radius,
      y: center.y + dy / distance * radius
    };
  }

  function layoutGraph(graph, options) {
    if (!validateGraph(graph)) throw new Error('Invalid skill graph');
    var settings = options || {};
    var center = settings.center || DEFAULT_CENTER;
    var circleRadius = settings.circleRadius || 442;
    var innerRadius = settings.innerRadius === undefined ? 126 : settings.innerRadius;
    var outerRadius = Math.min(settings.outerRadius || 420, circleRadius);
    var startAngle = settings.startAngle === undefined ? -110 : settings.startAngle;
    var endAngle = settings.endAngle === undefined ? -70 : settings.endAngle;
    var lookups = buildLookups(graph);
    var depth = assignDepths(graph, lookups);
    if (!depth) throw new Error('Skill graph must be acyclic');
    var maxDepth = Math.max.apply(null, Object.keys(depth).map(function (id) { return depth[id]; }));
    var tiers = [];
    for (var tierIndex = 0; tierIndex <= maxDepth; tierIndex++) tiers.push([]);
    Object.keys(depth).forEach(function (id) { tiers[depth[id]].push(id); });
    orderTiers(tiers, lookups);

    var positions = {};
    tiers.forEach(function (tier, index) {
      var ratio = maxDepth ? index / maxDepth : 0;
      var radius = innerRadius + (outerRadius - innerRadius) * ratio;
      var usableStart = startAngle;
      var usableEnd = endAngle;
      if (tier.length === 1) {
        usableStart = (startAngle + endAngle) / 2;
        usableEnd = usableStart;
      } else if (index < maxDepth) {
        var taper = 0.32 * (1 - ratio);
        var inset = (endAngle - startAngle) * taper;
        usableStart += inset;
        usableEnd -= inset;
      }
      tier.forEach(function (id, itemIndex) {
        var angle = tier.length === 1
          ? usableStart
          : usableStart + (usableEnd - usableStart) * itemIndex / (tier.length - 1);
        var point = capToCircle(polarPoint(center, radius, angle), center, circleRadius);
        positions[id] = {
          x: point.x,
          y: point.y,
          angle: angle,
          depth: index,
          tierIndex: itemIndex,
          tierSize: tier.length,
          terminal: lookups.children[id].length === 0
        };
      });
    });

    return {
      graph: graph,
      positions: positions,
      parents: lookups.parents,
      children: lookups.children,
      tiers: tiers,
      maxDepth: maxDepth,
      center: center,
      circleRadius: circleRadius,
      startAngle: startAngle,
      endAngle: endAngle
    };
  }

  function edgePath(layout, edge) {
    var start = layout.positions[asId(edge.from)];
    var end = layout.positions[asId(edge.to)];
    if (!start || !end) return '';
    var distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    var lead = Math.min(54, Math.max(16, distance * 0.36));
    var startRadians = start.angle * Math.PI / 180;
    var endRadians = end.angle * Math.PI / 180;
    return 'M' + start.x.toFixed(2) + ' ' + start.y.toFixed(2) +
      ' C' + (start.x + Math.cos(startRadians) * lead).toFixed(2) + ' ' + (start.y + Math.sin(startRadians) * lead).toFixed(2) +
      ' ' + (end.x - Math.cos(endRadians) * lead).toFixed(2) + ' ' + (end.y - Math.sin(endRadians) * lead).toFixed(2) +
      ' ' + end.x.toFixed(2) + ' ' + end.y.toFixed(2);
  }

  function countApproximateOverlaps(layout, minimumDistance) {
    var ids = Object.keys(layout.positions);
    var threshold = minimumDistance || 18;
    var count = 0;
    for (var i = 0; i < ids.length; i++) {
      for (var j = i + 1; j < ids.length; j++) {
        var left = layout.positions[ids[i]];
        var right = layout.positions[ids[j]];
        if (Math.sqrt(Math.pow(left.x - right.x, 2) + Math.pow(left.y - right.y, 2)) < threshold) count += 1;
      }
    }
    return count;
  }

  window.CodeologySkillTreeEngine = {
    layoutGraph: layoutGraph,
    edgePath: edgePath,
    capToCircle: capToCircle,
    validateGraph: validateGraph,
    countApproximateOverlaps: countApproximateOverlaps
  };
})();
