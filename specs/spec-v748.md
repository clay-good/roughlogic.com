# roughlogic.com Specification v748 -- Pile Group Spacing for a Target Efficiency (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v747.md. Explore sweep #14 (entry 2).
>
> **The gap, and the evidence for it.** The `pile-group-efficiency` tile runs the Converse-Labarre relation forward: from
> a spacing it returns the group efficiency. The layout question is the inverse -- **the center-to-center spacing that
> reaches a target efficiency**. From `Eg = 1 - atan(d/s) x K / (90 m n)` with `K = (n-1)m + (m-1)n`,
> `theta = (1 - Eg) x 90 m n / K` and `s = d / tan(theta)`. The number this settles: a **3x3** group of **12 in** piles
> targeting **Eg 0.75** needs about a **39.6 in** (3.3d) spacing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`pile-group-efficiency` sibling: the row/column counts and target efficiency are dimensionless, the pile diameter and
returned spacing are `L` (in), and the angle is dimensionless (deg). It reuses the sibling's Converse-Labarre relation,
solved for the spacing. The v18/v21 contract: any non-finite input, fewer than one row or column, a non-positive pile
diameter, or a target efficiency outside (0, 1) returns `{ error }`; a single pile (K = 0) has no group effect
(efficiency is always 1) and returns an explanatory `{ error }`; a target efficiency too low to reach with a spacing of at
least one diameter (theta >= 45 deg) returns an explanatory `{ error }`. Citation discipline (v19/v22): the relation
solved for the spacing, `GOVERNANCE.general` matching the sibling; the note states that a looser (higher) target needs a
wider spacing (a common layout target is 3d), that the spacing must be **at least one diameter**, and that this is an
empirical friction-pile hand check with **block failure and settlement separate** and the geotechnical engineer of record
governing.

## 2. The tile

### 2.1 `pile-group-spacing-for-efficiency` -- Pile Group Spacing for a Target Efficiency

```
inputs:
  rows_n         dimensionless pile rows n (>= 1)
  cols_m         dimensionless pile columns m (>= 1)
  diameter_in    L             pile diameter d (in, > 0)
  target_eg      dimensionless target efficiency Eg (0 < Eg < 1)

K                 = (n-1)m + (m-1)n            (must be > 0; a 1x1 group has no group effect)
theta_deg         = (1 - target_eg) x 90 m n / K   (must be < 45 for s >= d)
spacing_in        = diameter_in / tan(theta_deg)
spacing_diameters = spacing_in / diameter_in
```

**Pinned worked example.** n = 3, m = 3, d = 12 in, target Eg = 0.75:
`K = (2)(3) + (2)(3) = 12`, `theta = 0.25 x 90 x 9 / 12 = 16.875 deg`, `s = 12 / tan(16.875) = ` **39.6 in** (3.30d).
Feeding 39.6 in back through `pile-group-efficiency` at the same group returns Eg 0.75, the target. A tighter Eg 0.85
target needs a wider ~68 in spacing.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction"]`) placed beside `pile-group-efficiency` (Group E is not
exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (relation solved for the spacing,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`pile-group-spacing-for-efficiency` -> `computePileGroupSpacingForEfficiency`);
`scripts/related-tiles.mjs` (-> `pile-group-efficiency` / `pile-axial-capacity` / `soil-bearing-capacity`);
`data/search/aliases.json` (5 collision-checked question aliases: "pile group spacing", "how far apart piles", ...); the
calc-geotech `GEOTECH_RENDERERS` map entry via the shared `_simpleRenderer` factory (four number fields) and the id added
to the calc-geotech declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus
+ tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computePileGroupEfficiency` across an n/m/d/Eg sweep, the higher-target-wider-spacing monotonicity, the 1x1 and
too-low-target impossibilities, and the error seams. The calc-geotech.js gzip cap (raised to 23000 B in this spec, covering
v748 and v749) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint.
Home tile count 1,196 -> 1,197.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 39.6 in for a 3x3 group of
12 in piles at Eg 0.75).

## 5. Roadmap position

Pairs the forward pile-group tile (`pile-group-efficiency`, efficiency from the spacing) with its inverse (the spacing for
an efficiency), the two halves of the group-layout question. Continues Explore sweep #14; further Group E geotech growth
stays evidence-driven.
