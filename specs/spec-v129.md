# roughlogic.com Specification v129 -- Weld Metal Volume, Filler Consumed, and Pass Count (calc-fab.js, Group E, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v129..v135 (metal-trades: welding deposit / distortion / weld-group, plate forming, shrink fit, cutting power).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one fabrication tile from first-principles
> joint geometry and steel density, WPS-and-fabricator governed, redo-not-harm. Adds one tile to
> **`calc-fab.js`** (Group E); no new module, group, or dependency. Inherits spec.md through
> spec-v128.md.
>
> **The gap, and the evidence for it.** The catalog prices a finished weld (`weld-cost-per-foot`)
> and weighs stock (`metal-weight`), but never sizes the deposit itself: the weld-metal volume from
> the joint cross-section, the filler actually consumed once deposition efficiency is applied, and
> the number of passes a fillet or groove takes. That is the first number on every weld estimate and
> the basis for filler purchasing and arc-time planning, and it has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Fillet leg, joint length, and the max single-pass throat are `L`, weld cross-section is `L^2`,
deposit volume is `L^3`, density is `M L^-3`, deposited and filler weight are `M`, and deposition
efficiency and pass count are `dimensionless`. The bundled steel density (0.2836 lb/in^3, matching
`metal-weight`) and the per-process deposition efficiency are annotated editable fields. The
v18/v21 contract: any non-finite input, a non-positive leg/area, length, or max-pass area, or a
deposition efficiency outside (0, 1], returns `{ error }`; the only divisions are by guarded-
positive deposition efficiency and max-pass area. Citation discipline (v19/v22): `GOVERNANCE.general`
over the weight = area x length x density relation, the equal-leg fillet area leg^2/2, and the
deposit / efficiency filler relation; the WPS and the fabricator's measured deposition efficiency
govern.

## 2. The tile

### 2.1 `weld-metal-volume` -- Weld Deposit Weight, Filler Consumed, and Pass Count

```
inputs:
  joint_type        enum           fillet (by leg) or groove (by entered cross-section)
  fillet_leg_in     L              equal-leg fillet size (fillet mode)
  groove_area_in2   L^2            weld cross-sectional area (groove mode, user-supplied)
  length_in         L              total length of weld
  deposition_eff    dimensionless  deposited / filler purchased (default 0.90 solid wire)
  max_pass_area_in2 L^2            max single-pass weld area (default 0.05)

weld_area_in2  = (joint_type == fillet) ? fillet_leg_in^2 / 2 : groove_area_in2
deposit_in3    = weld_area_in2 x length_in
deposit_lb     = deposit_in3 x 0.2836
filler_lb      = deposit_lb / deposition_eff
passes         = ceil(weld_area_in2 / max_pass_area_in2)
```

**Pinned worked example.** 5/16 in (0.3125) equal-leg fillet, 120 in long, solid-wire efficiency
0.90, 0.05 in^2 max pass: `weld_area = 0.3125^2 / 2 = 0.0488 in^2`;
`deposit = 0.0488 x 120 = 5.86 in^3`; `deposit_lb = 5.86 x 0.2836 = 1.66 lb`;
`filler_lb = 1.66 / 0.90 = 1.85 lb`; `passes = ceil(0.0488 / 0.05) = 1`. **Cross-check (heavy
multi-pass SMAW).** A 1/2 in (0.5) fillet, same 120 in, stick efficiency 0.65:
`weld_area = 0.125 in^2`, `deposit = 15 in^3 = 4.25 lb`, `filler = 4.25 / 0.65 = 6.55 lb`,
`passes = ceil(0.125 / 0.05) = 3`. The WPS and the shop's actual deposition efficiency govern the
purchase.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["welding", "fabrication"]`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the area/volume/weight and filler-efficiency
formulas, the 0.2836 density and default efficiencies listed, `editionNote` single-edition first-
principles); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-
map.js` (`weld-metal-volume` -> `computeWeldMetalVolume` in `../../calc-fab.js`); `scripts/related-
tiles.mjs` (-> `weld-cost-per-foot` / `wire-feed-deposition` / `metal-weight`);
`data/search/aliases.json` ("weld metal", "deposit weight", "filler metal", "electrode consumption",
"number of passes", "weld volume"); the id appended to the existing `FAB_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the example, cross-check, and error seams (non-finite, leg/area/length <= 0,
efficiency outside (0,1]). Raise the `calc-fab.js` `check-module-sizes.mjs` cap by ~20 percent if
needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the deposit, filler, and
pass-count lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (5/16 fillet
/ 120 in -> 1.66 lb deposit, 1.85 lb filler, 1 pass).

## 5. Roadmap position

Opens the weld-estimating family (deposit volume, deposition rate v130) beside the existing weld-
cost tile. Further Group E growth stays evidence-driven.
