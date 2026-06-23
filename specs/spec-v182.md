# roughlogic.com Specification v182 -- PV Source/Output Circuit Ampacity (NEC 690.8, the 156% Rule) (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter: one tile computing the PV source- and
> output-circuit maximum current and the minimum conductor ampacity under NEC 690.8(A)/(B) -- the
> stacked 125% factors that yield the familiar 156% of module Isc. Adds one tile to **`calc-solar.js`**
> (Group A); no new module, group, or dependency. Inherits spec.md through spec-v178.md.
>
> **The gap, and the evidence for it.** The catalog sizes PV string *voltage* (`pv-string-sizing`,
> temperature-corrected Voc) and the interconnection busbar (`pv-interconnection-busbar`, the 120%
> rule), but never the *current* side: 690.8(A) takes the maximum circuit current as Isc x 1.25, and
> 690.8(B) then requires the conductor ampacity to be the greater of that current x 1.25 (continuous)
> or the current after conditions of use. The product is 1.56 x Isc, the number every PV conductor is
> sized to, and no tile computes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
module Isc, the maximum circuit current, and the minimum conductor ampacity are current `I`; the
parallel-string count is a count; the 1.25 factors are `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive Isc, or a string count below 1 returns `{ error }`; there are no
user-denominator divisions. Citation discipline (v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023
690.8(A) (maximum circuit current) and 690.8(B) (conductor ampacity)`, `editionNote` `NEC_DISCLOSURE`,
with the note that 690.8(A)(1) uses Isc x 1.25 (or the labeled module Imax for newer modules),
that 690.8(B)(1) applies a further 125% for continuous duty *before* temperature/conduit derating, and
that the conductor must finally satisfy the greater of the 690.8(B)(1) and (B)(2) results -- the
engineer and the AHJ govern.

## 2. The tile

### 2.1 `pv-circuit-ampacity` -- PV Maximum Current and Minimum Conductor Ampacity (690.8)

```
inputs:
  module_isc_a       I       module short-circuit current (or labeled max current), per source circuit
  parallel_strings   count   number of source circuits paralleled into the output circuit
  ocpd_a             I       (optional) series fuse / OCPD rating to compare against

max_current_a      = module_isc_a x parallel_strings x 1.25         # 690.8(A)(1)
min_ampacity_a     = max_current_a x 1.25                           # 690.8(B)(1), before derate
# effective stacked factor on Isc = 1.25 x 1.25 = 1.5625 (the "156%")
note: also size for 690.8(B)(2) after temperature/conduit conditions and pick the greater
```

**Pinned worked example.** Two source circuits paralleled, each module Isc = 10 A:
`max_current = 10 x 2 x 1.25 = 25 A` (690.8(A)); `min_ampacity = 25 x 1.25 = 31.25 A` (690.8(B)(1)) --
that is `10 x 2 x 1.5625 = 31.25 A`, the 156% result. A #10 conductor (40 A at 90 C) clears it before
the rooftop temperature derate (cross-reference `rooftop-temp-adder`). **Cross-check (single string).**
One string, Isc = 10 A: `max_current = 10 x 1.25 = 12.5 A`; `min_ampacity = 12.5 x 1.25 = 15.6 A`. The
final conductor must also satisfy 690.8(B)(2) after conditions of use; the engineer governs.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 690.8(A)/(B), the two 125% factors and the
156% product and the (B)(2) caveat listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`pv-circuit-ampacity` -> `computePvCircuitAmpacity` in `../../calc-solar.js`);
`scripts/related-tiles.mjs` (-> `pv-string-sizing` / `pv-interconnection-busbar` / `rooftop-temp-adder`);
`data/search/aliases.json` ("pv ampacity", "690.8", "156 percent", "1.56 isc", "solar conductor
sizing", "pv max current"); the id appended to the existing `SOLAR_RENDERERS` declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
two-string example, the single-string cross-check, and error seams (non-finite, Isc <= 0, strings <
1). Raise the `calc-solar.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the single-string path); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the max
current and min ampacity lines wrap on a phone); render-no-nan + a11y sweep, output read to the value
(2 x 10 A -> 25 A max, 31.25 A min; 1 x 10 A -> 12.5 A / 15.6 A).

## 5. Roadmap position

Completes the PV trio (`pv-string-sizing` voltage, `pv-interconnection-busbar` busbar, this for
current) and feeds `rooftop-temp-adder`. Further Group A growth stays evidence-driven.
