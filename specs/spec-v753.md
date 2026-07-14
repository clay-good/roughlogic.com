# roughlogic.com Specification v753 -- RC Column Longitudinal Steel for a Target Load (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v752.md. Explore sweep #14 (entry 8).
>
> **The gap, and the evidence for it.** The `rc-column-axial` tile runs ACI 318-19 forward: from the steel area it returns
> the design axial strength. The design question is the inverse -- **the longitudinal steel a target factored load needs**
> for a given column. From `phi Pn = 0.80 x 0.65 x [0.85 f'c (Ag - Ast) + fy Ast]`,
> `Ast = (phi Pn / 0.52 - 0.85 f'c Ag) / (fy - 0.85 f'c)`. The number this settles: a **16 in** square **4,000 psi**
> column carrying a **639 kip** design load needs about **6.33 in^2** (2.47%).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`rc-column-axial` sibling: the target load is `M L T^-2` (kip), the dimensions are `L` (in), f'c and fy are
`M L^-1 T^-2` (psi), the returned steel and gross areas are `L^2`, and the ratio is dimensionless. It reuses the sibling's
ACI 318-19 tied-column relation, solved for the steel. The v18/v21 contract: any non-finite input, a non-positive target
load, dimension, or strength, or a **fy at or below 0.85 f'c** (the denominator) returns `{ error }`. The reported steel is
the **larger of the strength requirement and the ACI 10.6.1 1% minimum** (0.01 Ag), and a strength requirement above the
8% maximum sets an `over_max` flag (the section is too small). Citation discipline (v19/v22): the relation solved for the
steel, `GOVERNANCE.general` matching the sibling; the note says to **round up to a whole-bar layout**, that a load over 8%
means enlarge the column, and that this is a **concentric short tied column** (no P-M interaction or slenderness) with the
engineer of record governing.

## 2. The tile

### 2.1 `rc-column-steel-for-load` -- RC Column Longitudinal Steel for a Target Load

```
inputs:
  target_load_kip   M L T^-2      target factored axial load phi Pn (kip, > 0)
  b_in              L             column width b (in, > 0)
  h_in              L             column depth h (in, > 0)
  fc_psi            M L^-1 T^-2   concrete strength f'c (psi, > 0; default 4000)
  fy_psi            M L^-1 T^-2   steel yield fy (psi, > 0.85 f'c; default 60000)

ag_in2           = b_in x h_in
ast_strength     = (target_load_kip x 1000 / 0.52 - 0.85 f'c Ag) / (fy - 0.85 f'c)
ast_required_in2 = max(ast_strength, 0.01 x Ag)           (1% minimum governs the minimum)
over_max         = ast_required_in2 > 0.08 x Ag           (section too small)
rho_g            = ast_required_in2 / Ag
```

**Pinned worked example.** target = 639 kip, b = h = 16 in, f'c = 4000 psi, fy = 60,000 psi:
`Ag = 256`, `ast = (639000/0.52 - 0.85 x 4000 x 256) / (60000 - 3400) = 358,446 / 56,600 = ` **6.33 in^2** (2.47%,
strength governs). Feeding 6.33 in^2 back through `rc-column-axial` at the same column returns a 639 kip design load, the
target. A small 300 kip load on a 20 in column falls under the 1% minimum (4.0 in^2 governs).

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`) placed beside `rc-column-axial` (Group E is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (relation solved for the steel,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`rc-column-steel-for-load` -> `computeRcColumnSteelForLoad`);
`scripts/related-tiles.mjs` (-> `rc-column-axial` / `rc-beam-flexure` / `steel-column-capacity`);
`data/search/aliases.json` (5 collision-checked question aliases: "column steel for load", "how much steel column", ...);
the calc-concrete `CONCRETE_RENDERERS` map entry via the shared `_simpleRenderer` factory (five number fields) and the id
added to the calc-concrete declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeRcColumnAxial` across strength-governed cases, the bigger-load-more-steel and bigger-column-less-steel
monotonicity, the 1%-minimum and over-8% flags, and the error seams. The calc-concrete.js gzip cap (28000 B, raised in
spec-v752 for both tiles) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home
first paint. Home tile count 1,201 -> 1,202.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 6.33 in^2 for a 639 kip
load on a 16 in square 4,000 psi column).

## 5. Roadmap position

Pairs the forward column tile (`rc-column-axial`, strength from the steel) with its inverse (the steel for a load), the
two halves of the tied-column sizing question. Continues Explore sweep #14; further Group E concrete growth stays
evidence-driven.
