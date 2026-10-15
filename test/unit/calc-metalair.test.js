// calc-metalair.js against references the specs did not write. The
// worked-example fixture recomputes each spec's own example, so a spec and its
// tile that share an error agree with each other; these tests hold the tiles
// to an independent method instead.

import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSquareToRoundDevelopment } from "../../calc-metalair.js";

const within = (got, want, tolPct, label) => {
  const tol = Math.abs(want) * tolPct / 100;
  assert.ok(Math.abs(got - want) <= tol, `${label}: got ${got}, want ${want} +/- ${tolPct}%`);
};

// ---- square-to-round-development: an independent 3-D model and flat unfold ----
//
// The transition is built as a solid in 3-D: the square at z = 0 (centre offset
// along x from the circle's centre), the circle at z = h divided into 4N points.
// Each corner fans to the quarter of the circle it faces (its 0..90 degree arc),
// and each side's flat triangle meets the circle where the tangent is parallel
// to that side. Every element line's true length is then a straight 3-D
// distance, and the flat pattern is unfolded triangle by triangle from those
// distances alone (two circle intersections per new point) -- no plan-distance
// hypotenuse anywhere, so a shared error in that formula cannot hide here.
const d3 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

function triangulate({ square_side_in: a, round_diameter_in: D, height_in: h, offset_in: off = 0, elements_per_quadrant: n }) {
  const H = a / 2, R = D / 2;
  const circ = (k) => { const t = k * Math.PI / 2 / n; return [R * Math.cos(t), R * Math.sin(t), h]; };
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => [sx * H + off, sy * H, 0]);
  // Place point P in the flat given its true distances to A and B (already flat).
  const place = (A, fA, B, fB, P, side) => {
    const dA = d3(A, P), dB = d3(B, P);
    const dx = fB[0] - fA[0], dy = fB[1] - fA[1], L = Math.hypot(dx, dy);
    const x = (dA * dA - dB * dB + L * L) / (2 * L);
    const y = Math.sqrt(Math.max(0, dA * dA - x * x));
    const ux = dx / L, uy = dy / L;
    return [fA[0] + ux * x - uy * y * side, fA[1] + uy * x + ux * y * side];
  };
  const M0 = [H + off, 0, 0];
  let pB = M0, pT = circ(0), fB = [0, 0], fT = [0, d3(M0, pT)];
  const lines = [d3(M0, pT)], diagonal = [], flatTop = [fT], flatBottom = [fB], outline = [fB, fT];
  for (let k = 0; k < 4; k++) {
    const C = corners[k];
    fB = place(pB, fB, pT, fT, C, -1); pB = C; flatBottom.push(fB); outline.push(fB);
    lines.push(d3(C, pT));
    for (let i = 1; i <= n; i++) {
      const P = circ(k * n + i);
      fT = place(pT, fT, pB, fB, P, 1); pT = P; flatTop.push(fT); outline.push(fT);
      lines.push(d3(pB, P));
      if (2 * i === n) diagonal.push(d3(pB, P)); // the 45 degree element of this corner's fan
    }
  }
  fB = place(pB, fB, pT, fT, M0, -1); flatBottom.push(fB); outline.push(fB);
  const pathLen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  return { lines, diagonal, topLen: pathLen(flatTop), bottomLen: pathLen(flatBottom), outline };
}

const S2R_CASES = [
  { square_side_in: 20, round_diameter_in: 14, height_in: 16, offset_in: 0, elements_per_quadrant: 8, seam_allowance_in: 0 },
  { square_side_in: 24, round_diameter_in: 12, height_in: 10, offset_in: 0, elements_per_quadrant: 6, seam_allowance_in: 0 },
  { square_side_in: 30, round_diameter_in: 24, height_in: 8, offset_in: 0, elements_per_quadrant: 12, seam_allowance_in: 0 },
  { square_side_in: 20, round_diameter_in: 14, height_in: 16, offset_in: 2, elements_per_quadrant: 8, seam_allowance_in: 0 },
];

test("square-to-round: the longest element is the longest 3-D line on the triangulated solid", () => {
  for (const c of S2R_CASES) {
    const r = computeSquareToRoundDevelopment(c);
    const m = triangulate(c);
    within(r.longest_true_length_in, Math.max(...m.lines), 1e-9, `longest, ${JSON.stringify(c)}`);
    within(r.fan_edge_true_length_in, Math.max(...m.lines), 1e-9, `fan edge, ${JSON.stringify(c)}`);
  }
});

test("square-to-round: the corner element is the shortest 3-D line in the far corner's fan", () => {
  // Concentric with N even: a circle point sits on each corner's diagonal, and
  // that 45 degree element is the shortest. With an offset the nearest circle
  // point moves off 45 degrees, so it is found by a brute-force 3-D scan of the
  // far corner's quarter arc instead.
  for (const c of S2R_CASES) {
    const r = computeSquareToRoundDevelopment(c);
    const m = triangulate(c);
    const corner = [c.square_side_in / 2 + c.offset_in, c.square_side_in / 2, 0];
    let scan = Infinity;
    for (let i = 0; i <= 90000; i++) {
      const t = i / 90000 * Math.PI / 2;
      scan = Math.min(scan, d3(corner, [c.round_diameter_in / 2 * Math.cos(t), c.round_diameter_in / 2 * Math.sin(t), c.height_in]));
    }
    within(r.corner_true_length_in, scan, 1e-6, `corner by scan, ${JSON.stringify(c)}`);
    if (c.offset_in === 0) {
      within(r.corner_true_length_in, m.diagonal[0], 1e-9, `corner = 45 degree element, ${JSON.stringify(c)}`);
      for (const d of m.diagonal) within(d, m.diagonal[0], 1e-9, "four equal corners on a concentric piece");
    }
  }
});

test("square-to-round: on a concentric piece the side midpoint element is the shortest 3-D line", () => {
  for (const c of S2R_CASES.filter((x) => x.offset_in === 0)) {
    const r = computeSquareToRoundDevelopment(c);
    within(r.midpoint_true_length_in, Math.min(...triangulate(c).lines), 1e-9, `midpoint, ${JSON.stringify(c)}`);
  }
});

test("square-to-round: the unfolded pattern's curved edge measures the tile's developed arc, and its straight edge the square's perimeter", () => {
  for (const c of S2R_CASES) {
    const r = computeSquareToRoundDevelopment(c);
    const m = triangulate(c);
    within(m.topLen, r.developed_arc_in, 1e-9, `developed arc, ${JSON.stringify(c)}`);
    within(m.bottomLen, 4 * c.square_side_in, 1e-9, `square edge closes, ${JSON.stringify(c)}`);
  }
});

test("square-to-round: the inscribed-polygon shortfall follows its series pi^3 D / (6 N^2)", () => {
  // N sin(pi/N) = pi - pi^3/(6 N^2) + pi^5/(120 N^4) - ..., so the chord sum
  // falls short of pi D by pi^3 D/(6 N^2) to leading order (Taylor series of sin).
  for (const n of [4, 8, 16, 32]) {
    const r = computeSquareToRoundDevelopment({ square_side_in: 20, round_diameter_in: 14, height_in: 16, elements_per_quadrant: n });
    const N = 4 * n;
    const series = Math.PI ** 3 * 14 / (6 * N * N) - Math.PI ** 5 * 14 / (120 * N ** 4);
    within(r.arc_shortfall_in, series, 0.01, `N = ${N}`);
  }
});

test("square-to-round: a vanishing height reduces every true length to its plan distance", () => {
  // Limit of the triangulation: a flat transition has nothing to understate.
  const c = { square_side_in: 20, round_diameter_in: 14, height_in: 1e-6, elements_per_quadrant: 8 };
  const r = computeSquareToRoundDevelopment(c);
  within(r.corner_true_length_in, 10 * Math.SQRT2 - 7, 1e-6, "corner = half-diagonal - radius");
  within(r.midpoint_true_length_in, 3, 1e-6, "midpoint = half side - radius");
  within(r.longest_true_length_in, Math.hypot(3, 10), 1e-6, "fan edge = corner to the in-line circle point");
});

// FIXED 2026-10-15: the sheet the tile said the pattern needs could not hold the
// one-piece flat pattern. Unfolding the worked piece (20 in square,
// 14 in round, 16 in high, 8 per quadrant, no seam allowance) and rotating it
// through 180 degrees, the narrowest it ever measures is 26.8 in across, against
// the tile's 20.0 in x 60.2 in sheet; the minimum-area enclosing rectangle is
// about 26.8 in x 64.5 in. The tile sizes the sheet as (square side) by
// (2 x longest element + circumference / 2), which is not the pattern's extent.
test("square-to-round: the reported sheet holds the one-piece flat pattern, and is not much bigger", () => {
  const c = { square_side_in: 20, round_diameter_in: 14, height_in: 16, offset_in: 0, elements_per_quadrant: 8, seam_allowance_in: 0 };
  const r = computeSquareToRoundDevelopment(c);
  const pts = triangulate(c).outline;
  let minWidth = Infinity, fits = false;
  for (let d = 0; d < 1800; d++) {
    const t = d * Math.PI / 1800, co = Math.cos(t), si = Math.sin(t);
    const u = pts.map((p) => p[0] * co + p[1] * si), v = pts.map((p) => -p[0] * si + p[1] * co);
    const w = Math.max(...u) - Math.min(...u), l = Math.max(...v) - Math.min(...v);
    minWidth = Math.min(minWidth, w, l);
    if ((w <= r.sheet_width_in && l <= r.sheet_length_in) || (l <= r.sheet_width_in && w <= r.sheet_length_in)) fits = true;
  }
  within(minWidth, 26.80, 0.1, "the pattern's narrowest width");
  // The reported sheet must contain the pattern (a whisker of float slack), and be the tight one.
  if (!fits) for (let d = 0; d < 1800 && !fits; d++) {
    const t = d * Math.PI / 1800, co = Math.cos(t), si = Math.sin(t);
    const u = pts.map((p) => p[0] * co + p[1] * si), v = pts.map((p) => -p[0] * si + p[1] * co);
    const w = Math.max(...u) - Math.min(...u), l = Math.max(...v) - Math.min(...v);
    if (w <= r.sheet_width_in + 0.05 && l <= r.sheet_length_in + 0.05) fits = true; // the scan steps 0.1 degree; the tile refines the angle
  }
  assert.ok(fits, `the flat pattern must fit the ${r.sheet_width_in} x ${r.sheet_length_in} in sheet`);
  within(r.sheet_width_in, 26.80, 0.05, "sheet width");
  within(r.sheet_length_in, 64.45, 0.1, "sheet length");
});

test("square-to-round: the division is bounded so the pattern unfold stays cheap", () => {
  const c = { square_side_in: 20, round_diameter_in: 14, height_in: 16, offset_in: 0, seam_allowance_in: 0 };
  assert.ok(!("error" in computeSquareToRoundDevelopment({ ...c, elements_per_quadrant: 100 })));
  assert.ok("error" in computeSquareToRoundDevelopment({ ...c, elements_per_quadrant: 101 }));
});
