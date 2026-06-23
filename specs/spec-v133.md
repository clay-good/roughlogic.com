# roughlogic.com Specification v133 -- Minimum Plate Bend Radius from Ductility (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v129..v135.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one fabrication tile from the published forming-limit relation
> between bend radius, thickness, and elongation, mill-cert-and-fabricator governed, redo-not-harm.
> Adds one tile to **`calc-fab.js`** (Group E); no new module, group, or dependency. Inherits
> spec.md through spec-v132.md.
>
> **The gap, and the evidence for it.** The catalog develops the flat blank for a bend
> (`bend-allowance`) and a roll (`rolled-blank`), but never answers the question that comes first at
> the brake: how tight can this plate be bent before the outer fiber cracks? The minimum inside
> radius is a function of thickness and the steel's elongation, and getting it wrong cracks the part
> or forces a re-bend. No tile screens it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Thickness and the resulting minimum radius are `L`; elongation (percent in 2 in) is `dimensionless`,
as is the radius-to-thickness multiple. The v18/v21 contract: any non-finite input, a non-positive
thickness, or an elongation outside (0, 50] percent, returns `{ error }`; the only division is by a
guarded-positive elongation. Citation discipline (v19/v22): `GOVERNANCE.general` over the published
forming-limit relation `R_min = T x (50 / %elongation - 1)`; the mill certificate, the bend
orientation relative to the rolling direction, and the fabricator's press experience govern -- this
is a screen, and a bend across (transverse to) the grain tolerates a tighter radius than one along
it.

## 2. The tile

### 2.1 `min-bend-radius` -- Minimum Inside Bend Radius to Avoid Cracking

```
inputs:
  thickness_in    L              plate / sheet thickness
  elongation_pct  dimensionless  total elongation in 2 in from the mill cert (e.g., A36 ~ 20)

r_over_t   = 50 / elongation_pct - 1
r_min_in   = thickness_in x r_over_t
```

**Pinned worked example.** 1/4 in (0.25) A36 plate, mill-cert elongation 20 percent:
`r_over_t = 50/20 - 1 = 1.5`; `r_min = 0.25 x 1.5 = 0.375 in` -- a 3/8 in inside radius (1.5 T), a
common A36 rule. **Cross-check (low-ductility material).** The same 1/4 in plate at 10 percent
elongation: `r_over_t = 50/10 - 1 = 4`, `r_min = 0.25 x 4 = 1.0 in` (4 T) -- the less ductile steel
needs a far larger radius, the expected trade-off. Bend across the rolling direction where possible;
the mill cert and a test bend govern.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["fabrication", "sheet-metal"]`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the R_min = T(50/%E - 1) forming-limit relation,
`editionNote` single-edition published relation noting the grain-direction and screen caveats);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`min-bend-radius` -> `computeMinBendRadius` in `../../calc-fab.js`); `scripts/related-tiles.mjs` (->
`bend-allowance` / `rolled-blank` / `press-brake-tonnage`); `data/search/aliases.json` ("minimum
bend radius", "bend cracking", "r/t ratio", "forming limit", "plate bend", "elongation"); the id
appended to the existing `FAB_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error
seams (non-finite, thickness <= 0, elongation outside (0,50]). Raise the `calc-fab.js` size cap by
~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the r/t and r_min lines wrap
on a phone); render-no-nan + a11y sweep, output read to the value (0.25 in / 20 percent -> 1.5 T,
0.375 in).

## 5. Roadmap position

Adds the forming-limit screen to the plate-forming family (`bend-allowance`, `rolled-blank`,
`press-brake-tonnage`). Further Group E growth stays evidence-driven.
