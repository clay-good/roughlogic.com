# roughlogic.com Specification v173 -- Triplen-Harmonic Neutral Current (Three-Phase, Four-Wire) (calc-powerquality.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile computing the neutral current produced by
> third-harmonic (triplen) load on a three-phase, four-wire system, where the per-phase third harmonics
> add arithmetically in the neutral and can exceed the phase current. Adds one tile to
> **`calc-powerquality.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog computes the neutral current of a *balanced linear*
> three-phase load (`neutral-current-3ph`) and panel imbalance (`neutral-imbalance`), but neither
> captures the nonlinear case that overloads neutrals in the field: on a feeder full of switch-mode
> supplies and LED drivers, the third harmonic does not cancel -- it triples in the neutral. A neutral
> sized only for the fundamental cooks. No tile models it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
phase current and the resulting neutral current are `I`; the third-harmonic content is a fraction
(`dimensionless`, 0-1) of the phase RMS current. The v18/v21 contract: any non-finite input, a
negative phase current, or a third-harmonic fraction outside 0-1 returns `{ error }`; there are no
user-denominator divisions. Citation discipline (v19/v22): `GOVERNANCE.electrical`, edition `IEEE 519
(harmonics) and NEC 220.61(C) / 310.15(B)(5)(c) (neutral as a current-carrying conductor with major
triplen content)`, `editionNote` `NEC_DISCLOSURE`, with the note that triplen (3rd, 9th, ...)
harmonics are zero-sequence and add in the neutral, that this is a screening estimate from the
third-harmonic fraction alone (a full spectrum requires the RMS sum of all triplens), and that where
the neutral carries major harmonic current it counts as a current-carrying conductor for ampacity
adjustment.

## 2. The tile

### 2.1 `triplen-neutral` -- Neutral Current From Third-Harmonic Load

```
inputs:
  phase_a       I              balanced per-phase RMS line current
  i3_fraction   dimensionless  third-harmonic current as a fraction of phase RMS (0-1)

i3_phase_a       = i3_fraction x phase_a          # third-harmonic component in each phase
neutral_a        = 3 x i3_phase_a                  # triplens add arithmetically in the neutral
neutral_ratio    = neutral_a / phase_a             # > 1 means neutral exceeds the phase conductors
flag             = neutral_ratio > 1 -> "neutral exceeds phase current; size up neutral / count as CCC"
```

**Pinned worked example.** Balanced 100 A per phase with 40% third-harmonic content:
`i3_phase = 0.40 x 100 = 40 A`; `neutral = 3 x 40 = 120 A`; `ratio = 120 / 100 = 1.20` -> the
**neutral carries 120 A against 100 A phases** -> raise the neutral and treat it as a current-carrying
conductor. **Cross-check (low harmonic).** The same 100 A phases with 20% third harmonic:
`i3_phase = 20 A`; `neutral = 60 A`; `ratio = 0.60` -> neutral below the phase current, no flag. A
full triplen spectrum (3rd + 9th + ...) requires the RMS sum; this screens off the dominant 3rd. IEEE
519 and the AHJ govern.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, IEEE 519 with NEC 220.61(C)/310.15(B)(5)(c), the
zero-sequence triplen behavior noted, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`triplen-neutral` -> `computeTriplenNeutral` in `../../calc-powerquality.js`);
`scripts/related-tiles.mjs` (-> `neutral-current-3ph` / `neutral-imbalance` / `ambient-ampacity-adjust`);
`data/search/aliases.json` ("triplen", "third harmonic neutral", "harmonic neutral", "neutral
overload", "nonlinear neutral", "zero sequence"); the id appended to the existing
`POWERQUALITY_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the 40% example, the 20% cross-check, the
ratio>1 flag, and error seams (non-finite, phase < 0, fraction outside 0-1). Raise the
`calc-powerquality.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap
if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the no-flag path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
third-harmonic component, neutral current, and ratio wrap on a phone); render-no-nan + a11y sweep,
output read to the value (100 A / 40% -> 120 A neutral, ratio 1.20, flag; 20% -> 60 A, no flag).

## 5. Roadmap position

Adds the nonlinear neutral to the neutral family (`neutral-current-3ph`, `neutral-imbalance`) and the
ampacity-adjustment story (`ambient-ampacity-adjust`). Further Group A growth stays evidence-driven.
