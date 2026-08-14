import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../site/skill-tree-engine.js');

const engine = globalThis.CodeologySkillTreeEngine;
assert.ok(engine, 'engine should be exported to the browser global');

const graph = {
  nodes: Array.from({ length: 12 }, (_, id) => ({ id, title: `Skill ${id}` })),
  edges: [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 1, to: 4 },
    { from: 2, to: 5 }, { from: 2, to: 6 }, { from: 3, to: 7 }, { from: 4, to: 8 },
    { from: 5, to: 9 }, { from: 6, to: 10 }, { from: 8, to: 11 }, { from: 9, to: 11 }
  ]
};
const options = {
  center: { x: 500, y: 500 },
  circleRadius: 442,
  innerRadius: 125,
  outerRadius: 425,
  startAngle: -112,
  endAngle: -68
};

const first = engine.layoutGraph(graph, options);
const second = engine.layoutGraph(graph, options);
assert.deepEqual(first.positions, second.positions, 'layout should be deterministic');
assert.equal(first.maxDepth, 4, 'longest prerequisite route should define graph depth');
assert.equal(engine.countApproximateOverlaps(first, 18), 0, 'representative branch should not collide');
assert.deepEqual(
  Object.entries(first.positions).filter(([, point]) => point.onSpine).map(([id]) => id),
  ['0', '1', '4', '8', '11'],
  'the longest route should remain on the central spine'
);
for (const [id, point] of Object.entries(first.positions)) {
  if (point.onSpine) assert.equal(point.lane, 0, `spine node ${id} should stay centred`);
}
assert.equal(first.positions['2'].lane, 1, 'a short branch should leave through the nearest side lane');
assert.ok(
  Math.abs(first.positions['2'].angle - first.positions['0'].angle) < 15,
  'side leaves should remain near their branch point instead of filling the sector'
);
assert.ok(
  Math.hypot(first.positions['2'].x - first.positions['0'].x, first.positions['2'].y - first.positions['0'].y) < 90,
  'a side node should remain physically close to where it branches'
);
const spineSways = Object.values(first.positions).filter(point => point.onSpine).map(point => point.sway);
assert.ok(Math.max(...spineSways.map(Math.abs)) <= 4.501, 'central sway should remain deliberately subtle');
assert.ok(new Set(spineSways.map(value => value.toFixed(2))).size > 2, 'the spine should not render as a rigid ruler');

const alternatingGraph = {
  nodes: [0, 1, 2, 3, 4, 'a', 'b', 'c'].map(id => ({ id })),
  edges: [
    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
    { from: 1, to: 'a' }, { from: 2, to: 'b' }, { from: 3, to: 'c' }
  ]
};
const alternating = engine.layoutGraph(alternatingGraph, options);
assert.deepEqual(
  [alternating.positions.a.lane, alternating.positions.b.lane, alternating.positions.c.lane],
  [-1, 1, -1],
  'single side branches should alternate around the central spine by depth'
);
for (const point of Object.values(first.positions)) {
  assert.ok(Math.hypot(point.x - 500, point.y - 500) <= 442.001, 'nodes must stay inside the circle');
}
for (const edge of graph.edges) {
  assert.match(engine.edgePath(first, edge), /^M.+ C.+/, 'edges should use one smooth cubic curve');
}

assert.throws(() => engine.layoutGraph({
  nodes: [{ id: 'a' }, { id: 'b' }],
  edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]
}, options), /acyclic/, 'cyclic skill data should fail closed');

console.log('Reusable skill-tree layout, bounds, spacing and cycle checks passed.');
