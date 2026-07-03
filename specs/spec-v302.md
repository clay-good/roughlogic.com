# roughlogic.com Specification v302 -- Time of Concentration (Kirpich) (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v302..v304 (the site-hydraulics depth trio -- the pieces the
> rational-method and open-channel tiles need but do not compute: the watershed time of concentration (this spec, the `tc`
> that sets the rainfall intensity `stormwater-rational` demands), the orifice discharge of a detention outlet or tank
> drain (v303), and the open-channel flow regime by Froude number (v304).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `stormwater-rational` computes `Q = C i A` but takes
> the rainfall intensity `i` as a given -- and `i` is read from an IDF curve at the storm duration equal to the watershed's
> time of concentration, which the catalog never computes. Adds one tile to the existing **`calc-plumbing.js`** module
> (Group B), beside `stormwater-rational` and `manning-slope`; no new group, trade, or dependency. Inherits spec.md through
> spec-v301.md.
>
> **The gap, and the evidence for it.** The Kirpich equation estimates the time of concentration -- the time for runoff to
> travel from the hydraulically most distant point of a watershed to the outlet -- as `tc = 0.0078 L^0.77 S^(-0.385)`, with
> `tc` in minutes, the flow-path length `L` in feet, and the average slope `S` in ft/ft. For a 1,000 ft flow path at a 2%
> slope, `tc = 0.0078 x 1,000^0.77 x 0.02^(-0.385) = 7.2 min` -- the storm duration at which the designer reads the design
> rainfall intensity off the local IDF curve before handing it to `stormwater-rational`. Flatten the slope to 0.5% and the
> water takes 12.3 min, a lower intensity and a smaller peak: the reason a graded, ponding site sheds less peak flow than a
> steep one. `stormwater-rational` needs `i`; this tile gives the duration that sets it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The flow-path length `L` is a
length (ft); the slope `S` is a dimensionless rise-over-run (entered as ft/ft or percent); the time of concentration `tc`
is a time (min). The v18/v21 contract: any non-finite input, or a length or slope at or below zero, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the Kirpich time-of-concentration equation by name; `editionNote`
names **the Kirpich (1940) equation `tc = 0.0078 L^0.77 S^(-0.385)` (`tc` min, `L` ft, `S` ft/ft), as compiled in the
TR-55 and NRCS drainage references, with the note that Kirpich was calibrated on small rural channelized watersheds and
that overland/sheet flow on a paved surface is often taken at ~0.4x the Kirpich value**, and states that **this returns a
single-segment Kirpich estimate -- it is not the TR-55 three-segment (sheet + shallow concentrated + channel) travel-time
sum, does not apply the paved/overland adjustment factor automatically, and is an estimate for setting the design storm
duration, not a routed hydrograph; and this is a design aid, not a substitute for a licensed civil engineer's drainage
report** -- the engineer of record and the local drainage manual govern.

## 2. The tile

### 2.1 `time-of-concentration` -- Time of Concentration (Kirpich)

```
inputs:
  L_ft   ft      length of the flow path (most distant point to outlet)
  S      ft/ft   average slope of the flow path (or percent, converted)

tc_min = 0.0078 * L_ft^0.77 * S^(-0.385)          ; time of concentration, minutes
tc_hr  = tc_min / 60
```

**Pinned worked example (a 1,000 ft flow path at 2% slope).** `L = 1,000`, `S = 0.02`:
`tc = 0.0078 x 1,000^0.77 x 0.02^(-0.385) = 0.0078 x 204.2 x 4.508 = 7.18 min` -- the storm duration the designer takes to
the IDF curve. **Cross-check (flatten the slope to 0.5%).** `S = 0.005`: `tc = 0.0078 x 204.2 x 7.69 = 12.25 min` -- the
gentler slope stretches the travel time by 70%, lowering the design intensity and the peak `Q`, the flood-control value of
grading a site flat. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing","civil"]`, matching `stormwater-rational`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the Kirpich equation, `editionNote` naming
`tc = 0.0078 L^0.77 S^(-0.385)`, the TR-55 context, and the single-segment, no-overland-adjustment, estimate caveats);
`test/fixtures/worked-examples.json` (the 2% example + the 0.5% cross-check); `test/fixtures/compute-map.js`
(`time-of-concentration` -> `computeTimeOfConcentration` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (->
`stormwater-rational` / `manning-slope` / `orifice-flow` / `detention-time`); `data/search/aliases.json` ("time of
concentration", "tc", "Kirpich", "watershed travel time", "TR-55 tc", "rational method time", "storm duration", "runoff
travel time", "concentration time"); the id appended to the existing plumbing renderers block in `app.js`; the `// dims:`
annotation (`L` length, `S` dimensionless, `tc` time); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the slope-lengthens-tc behavior, and the non-positive / non-finite error seams. No new module; re-pin
`calc-plumbing.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the slope-exponent assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `tc_min` / `tc_hr` pair wraps on a
phone); render-no-nan + a11y sweep, output read to the value (1,000 ft at 2% -> 7.2 min).

## 5. Roadmap position

Opens the site-hydraulics depth batch (v302..v304) in `calc-plumbing.js`, supplying the storm duration `stormwater-rational`
depends on. The orifice discharge (v303) and the open-channel Froude regime (v304) follow. The TR-55 three-segment
travel-time sum (sheet + shallow concentrated + channel), the paved/overland adjustment factor, and a built-in IDF
intensity lookup are the deliberate next follow-ons once the trio lands.
