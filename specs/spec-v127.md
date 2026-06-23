# roughlogic.com Specification v127 -- Proportional EGC Upsize for Increased Conductors (NEC 250.122(B)) (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v121..v128.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one electrical tile from the public NEC 250.122(B) circular-mil
> proportion rule (numeric method, no copyrighted table reproduced), AHJ governed, redo-not-harm.
> Adds one tile to **`calc-electrical.js`** (Group A); no new module, group, or dependency. Inherits
> spec.md through spec-v126.md.
>
> **The gap, and the evidence for it.** The catalog sizes the equipment grounding conductor from the
> overcurrent device (`egc-sizing`) and computes the conductor upsize needed to hold a voltage-drop
> limit (`voltage-drop`, `min-conductor-for-vd`), but never the step those two imply together: when
> the ungrounded conductors are increased in size for voltage drop or future capacity, NEC
> 250.122(B) requires the EGC to be increased in proportion to their circular-mil area. Skipping it
> is one of the most common and most-cited grounding errors on an upsized feeder.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
All three conductor areas are circular mils (an area, `L^2`) and the upsize ratio is
`dimensionless`. The v18/v21 contract: any non-finite input, or a non-positive area, returns
`{ error }`; the only division is by a guarded-positive base phase-conductor area; a ratio below 1
is clamped to 1 (the EGC is never reduced below its table size). Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEC 2023 250.122(B) (increase in size of equipment grounding
conductors)`, `editionNote` `NEC_DISCLOSURE`; an assumption records that the base EGC size (from the
250.122 table for the OCPD) and the minimum-required phase area are user-supplied -- the tile bundles
neither table -- and that the EGC need never exceed the ungrounded conductors it runs with. The AHJ
governs.

## 2. The tile

### 2.1 `egc-upsize-proportional` -- EGC Increased in Proportion to Upsized Conductors

```
inputs:
  base_egc_cmil        L^2  table EGC area for the OCPD (NEC 250.122, user-supplied)
  base_phase_cmil      L^2  minimum-required ungrounded-conductor area before upsizing
  installed_phase_cmil L^2  area of the ungrounded conductor actually installed

ratio            = max(1, installed_phase_cmil / base_phase_cmil)
upsized_egc_cmil = base_egc_cmil x ratio       # then select the next standard AWG/kcmil >= this
```

**Pinned worked example.** 200 A feeder: base EGC #6 Cu (26,240 cmils per 250.122), minimum phase
3/0 Cu (167,800 cmils), upsized to 250 kcmil (250,000 cmils) for voltage drop:
`ratio = 250,000 / 167,800 = 1.490`; `upsized_egc = 26,240 x 1.490 = 39,095 cmils` -> next standard
size **#4 Cu (41,740 cmils)**. **Cross-check (no upsize).** If the installed phase equals the base
phase (167,800 cmils), `ratio = 1.0` and the EGC stays at its #6 table size of 26,240 cmils -- the
clamp path, confirming the rule only triggers on an actual increase. The AHJ governs the final size,
which need not exceed the ungrounded conductors.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 250.122(B), the ratio formula, the user-
supplied-table assumption, `editionNote` `NEC_DISCLOSURE`); `test/fixtures/worked-examples.json`
(example + cross-check); `test/fixtures/compute-map.js` (`egc-upsize-proportional` ->
`computeEgcUpsizeProportional` in `../../calc-electrical.js`); `scripts/related-tiles.mjs` (->
`egc-sizing` / `voltage-drop` / `parallel-conductor-derate`); `data/search/aliases.json` ("egc
upsize", "250.122(B)", "grounding conductor upsize", "proportional ground", "increased
conductors"); the id appended to the existing `ELECTRICAL_RENDERERS` declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
the example, cross-check (ratio-clamp path), and error seams (non-finite, area <= 0). Raise the
`calc-electrical.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap
if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the ratio and upsized-cmil
lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (26,240 base / 3-0 ->
250 kcmil -> ratio 1.49, 39,095 cmils, #4 Cu).

## 5. Roadmap position

Completes the grounding-conductor picture next to `egc-sizing` (table minimum) and the voltage-drop
upsize tiles. Further Group A growth stays evidence-driven.
