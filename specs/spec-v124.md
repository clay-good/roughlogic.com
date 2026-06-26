# roughlogic.com Specification v124 -- Feeder for a Group of Motors (NEC 430.24 / 430.62) (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-23 (package 0.73.0; part of catalog 600 -> 608). Batch spec-v121..v128.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one electrical tile from the public NEC Article 430 grouped-motor
> feeder method (numeric rules, no copyrighted table reproduced), AHJ governed, redo-not-harm. Adds
> one tile to **`calc-electrical.js`** (Group A); no new module, group, or dependency. Inherits
> spec.md through spec-v123.md.
>
> **The gap, and the evidence for it.** The catalog sizes a single motor branch circuit
> (`motor-branch-from-nameplate`, `motor-fla`) but never the feeder that supplies several motors:
> the 430.24 conductor rule (125 percent of the largest motor's full-load current plus the sum of
> the rest) and the 430.62 feeder overcurrent-device limit. A panel feeding a pump skid, an HVAC
> rack, or a conveyor line needs exactly that math, and it is missing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Full-load currents and the resulting feeder ampacity are electric current (amperes, the same
dimension token the existing Group A current tiles use); the 1.25 factor is `dimensionless`. The
v18/v21 contract: any non-finite input, or a negative current or device rating, returns
`{ error }`; there are no divisions. Citation discipline (v19/v22): `GOVERNANCE.electrical`, edition
`NEC 2023 430.24 (feeder conductors) and 430.62 (feeder overcurrent protection)`, `editionNote`
`NEC_DISCLOSURE`; an assumption records that each motor full-load current must be the NEC table
value (430.248 / 430.250), user-supplied -- the tile does not bundle the motor FLC tables. The AHJ
governs.

## 2. The tile

### 2.1 `multi-motor-feeder` -- Feeder Ampacity and Overcurrent for a Group of Motors

```
inputs:
  largest_flc_a          I  full-load current of the largest motor (NEC table value)
  sum_other_flc_a        I  sum of the full-load currents of all other motors
  largest_branch_ocpd_a  I  rating of the largest motor's branch-circuit OCPD (430.52)

min_feeder_ampacity = 1.25 x largest_flc_a + sum_other_flc_a          # 430.24
max_feeder_ocpd     = largest_branch_ocpd_a + sum_other_flc_a          # 430.62, then round DOWN
                                                                        # to a standard size
```

**Pinned worked example.** Largest motor FLC 28 A; two other motors 16 A + 10 A (sum 26 A); largest
branch OCPD 70 A: `min_feeder_ampacity = 1.25 x 28 + 26 = 35 + 26 = 61 A` (size conductors at
75 C >= 61 A); `max_feeder_ocpd = 70 + 26 = 96 A` -> next standard size **down** is 90 A.
**Cross-check.** Replace the 10 A motor with a 24 A motor (sum_other = 16 + 24 = 40 A), keeping the
28 A motor largest: `min_feeder_ampacity = 35 + 40 = 75 A`; `max_feeder_ocpd = 70 + 40 = 110 A`.
The motor FLC table value, not the nameplate amps, governs 430.24/430.62; the AHJ governs the final
feeder.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 430.24 / 430.62, formula strings, the FLC-
table-value assumption, `editionNote` `NEC_DISCLOSURE`); `test/fixtures/worked-examples.json`
(example + cross-check); `test/fixtures/compute-map.js` (`multi-motor-feeder` ->
`computeMultiMotorFeeder` in `../../calc-electrical.js`); `scripts/related-tiles.mjs` (->
`motor-branch-from-nameplate` / `motor-fla` / `breaker-sizing`); `data/search/aliases.json`
("motor feeder", "multiple motors", "430.24", "430.62", "feeder for motors", "group of motors");
the id appended to the existing `ELECTRICAL_RENDERERS` declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, cross-check, and error seams (non-finite, negative current or device rating). Raise the
`calc-electrical.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap
if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the feeder-ampacity and OCPD
lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (28 / 26 / 70 ->
61 A conductor, 90 A standard OCPD).

## 5. Roadmap position

Extends the motor family from the single branch circuit to the shared feeder, pairing with
`motor-branch-from-nameplate` and `breaker-sizing`. Further Group A growth stays evidence-driven.
