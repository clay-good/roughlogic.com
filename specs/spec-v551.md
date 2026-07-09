# roughlogic.com Specification v551 -- Masonry Compressive Strength f'm, Unit-Strength Method (calc-masonry.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-masonry.js`**
> (Group E, the masonry design bench); no new module, group, or dependency. Inherits spec.md through spec-v550.md.
>
> **The gap, and the evidence for it.** Every CMU wall tile in the bench (`cmu-wall-axial`, `cmu-wall-flexure`,
> `cmu-shear-wall`, `masonry-anchor-bolt`) **consumes** the masonry compressive strength `f'm`, but none derives it.
> `f'm` is the single most important masonry material input, and the TMS 602 unit-strength method lets a designer set it
> from the block strength and mortar type without a prism test. The catch is that `f'm` is not the unit strength and the
> **mortar type** matters: under TMS 602-16 Table 2, a 2,000 psi (net area) concrete unit in Type M or S mortar gives
> `f'm = 2,000 psi`, but the same unit in Type N mortar gives only `1,750 psi`, and at higher unit strengths `f'm` is a
> fraction of the block strength (a 3,250 psi unit yields 2,500 psi). Plugging the raw unit strength into the wall
> equations overstates capacity. The tile takes the unit type, net-area unit strength, and mortar type, and returns the
> `f'm` the wall tiles should use -- the upstream value the whole masonry bench depends on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The net-area unit
compressive strength and the resulting `f'm` are stresses (`M L^-1 T^-2`, in psi); the unit type and mortar type are
categorical (`dimensionless`). The v18/v21 contract: any non-finite input, a non-positive unit strength, or an
unrecognized unit or mortar type returns `{ error }`; a unit strength below the table minimum for the type returns a
result flagged as below the qualifying range. Citation discipline (v19/v22): `GOVERNANCE.general` over the unit-strength
method by name (TMS 602-16 Table 2); `editionNote` names the **TMS 602-16 unit-strength method (assumed f'm without
prism test)**, prints the `f'm` interpolated from the Table 2 curve for the given unit type, net-area unit strength, and
mortar type (Type M or S, or Type N), notes the anchor points (**concrete unit 2,000 psi -> f'm 2,000 with Type M/S,
1,750 with Type N; 3,250 psi -> 2,500 with Type M/S**), and states that **f'm is not the unit strength, Type N mortar
yields a lower f'm than Type M or S for the same unit, at higher unit strengths f'm is a fraction of the block strength,
grouting and inspection requirements apply, and TMS 602 and the engineer of record (or a prism test) govern** -- a
specification aid, not the engineer of record.

## 2. The tile

### 2.1 `masonry-prism-fm` -- The f'm Every CMU Wall Tile Needs (and Why the Mortar Type Changes It)

```
inputs:
  unit_type          -    concrete (CMU) or clay
  unit_strength_psi  psi  net-area compressive strength of the masonry unit
  mortar_type        -    M or S / N

f_m_psi = interpolate the TMS 602-16 Table 2 curve for (unit_type, unit_strength, mortar_type)   [psi]
```

**Pinned worked example (a 2,000 psi net-area concrete unit in Type S mortar).** Reading TMS 602-16 Table 2, the
2,000 psi C90 unit with Type M or S mortar gives `f'm = ` **2,000 psi** -- the common baseline the wall tiles are
designed to. **Cross-check (dropping to Type N mortar cuts f'm).** The identical 2,000 psi unit laid in Type N mortar
yields only `f'm = ` **1,750 psi** -- a 12.5% reduction from the mortar type alone, with no change to the block, which
is exactly why the raw unit strength cannot be used as f'm; and a stronger 3,250 psi unit in Type M/S gives 2,500 psi,
only 77% of the block strength. The tile returns the assumed `f'm` for the specified unit and mortar.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["masonry", "construction"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the Type S
example + the Type N cross-check); `test/fixtures/compute-map.js` (`masonry-prism-fm` -> `computeMasonryPrismFm` in
`../../calc-masonry.js`); `scripts/related-tiles.mjs` (-> `cmu-wall-axial` / `cmu-wall-flexure` / `cmu-shear-wall`);
`data/search/aliases.json` ("f'm masonry", "unit strength method", "tms 602 table 2", "masonry compressive strength",
"cmu f'm", "mortar type fm", "assumed fm", "prism test alternative"); the id appended to the masonry renderers declare
in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the Table 2 interpolation, the Type N vs Type M/S reduction, the below-minimum flag, and the error seams
(non-finite, non-positive unit strength, bad unit / mortar type). Hand-writes its renderer (mirroring the calc-masonry.js
`cmu-wall-axial` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the unit-strength / mortar / f'm stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the Type S example -> 2,000 psi f'm).

## 5. Roadmap position

Supplies the `f'm` that `cmu-wall-axial`, `cmu-wall-flexure`, `cmu-shear-wall`, and `masonry-anchor-bolt` all consume,
turning the masonry bench from "assume an f'm" to "derive it." A clay-masonry Table 2 branch and a prism-test-method
(record of tests) alternative are deliberate future follow-ons. Further Group E growth stays evidence-driven.
