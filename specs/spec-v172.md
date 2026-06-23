# roughlogic.com Specification v172 -- Motor Derating for Voltage Unbalance (NEMA MG-1) (calc-powerquality.js, Group A, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile turning a measured three-phase voltage
> unbalance into a NEMA MG-1 motor derating factor and the do-not-operate flag above 5%. Adds one tile
> to **`calc-powerquality.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog computes the voltage unbalance percentage
> (`voltage-imbalance`) but stops there -- it never tells the electrician what to *do* with it. NEMA
> MG-1 ties unbalance to a derating curve: a 1% unbalance is tolerable, but at 5% a motor must be
> derated to ~76% and beyond 5% should not be operated. Troubleshooting an overheating motor on an
> unbalanced feeder needs that derate factor, and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
three line-to-line voltages are `voltage`, the unbalance percentage and the derating factor are
`dimensionless`. The bundled NEMA MG-1 derating series (1% -> ~0.98, 2% -> ~0.95, 3% -> ~0.88, 4% ->
~0.82, 5% -> ~0.75) is annotated as the public MG-1 curve, linearly interpolated between points. The
v18/v21 contract: any non-finite input, or any non-positive voltage, returns `{ error }`; the only
division is by the guarded-positive average voltage. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEMA MG-1 (motor derating for voltage unbalance); unbalance per NEMA
definition`, `editionNote` `NEC_DISCLOSURE`, with the note that unbalance = max deviation from the
average divided by the average, that the derate curve is read off MG-1, and that **above 5% the motor
should not be operated** -- the manufacturer and MG-1 govern the final figure.

## 2. The tile

### 2.1 `motor-unbalance-derate` -- Motor Derating From Three-Phase Voltage Unbalance

```
inputs:
  v_ab    voltage   line-to-line voltage A-B
  v_bc    voltage   line-to-line voltage B-C
  v_ca    voltage   line-to-line voltage C-A

v_avg          = (v_ab + v_bc + v_ca) / 3
max_dev        = max(|v_ab - v_avg|, |v_bc - v_avg|, |v_ca - v_avg|)
unbalance_pct  = max_dev / v_avg x 100
derate_factor  = NEMA MG-1 curve at unbalance_pct        # interpolated; 1.00 at 0%, ~0.75 at 5%
allowable_pct  = derate_factor x 100
flag           = unbalance_pct > 5 -> "do not operate (NEMA MG-1)"
```

**Pinned worked example.** Measured 460 / 455 / 450 V: `v_avg = 455`; deviations 5 / 0 / 5 ->
`max_dev = 5`; `unbalance = 5 / 455 = 1.10%`. Off the MG-1 curve a ~1.1% unbalance gives a derating
factor of about **0.98**, so the motor is loaded to ~98% of nameplate -- a small but real penalty.
**Cross-check (the limit).** Measured 480 / 456 / 456 V: `v_avg = 464`; `max_dev = 16`;
`unbalance = 16 / 464 = 3.45%`, derate ~**0.85**. And any reading over **5%** unbalance raises the
do-not-operate flag. The manufacturer and MG-1 govern; correct the unbalance source first.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEMA MG-1, the unbalance definition and the derate
curve points listed, `editionNote` `NEC_DISCLOSURE`); `test/fixtures/worked-examples.json` (example +
cross-check); `test/fixtures/compute-map.js` (`motor-unbalance-derate` ->
`computeMotorUnbalanceDerate` in `../../calc-powerquality.js`); `scripts/related-tiles.mjs`
(-> `voltage-imbalance` / `motor-fla` / `motor-vd-starting`); `data/search/aliases.json` ("motor
derate", "voltage unbalance", "NEMA MG-1", "motor unbalance", "phase unbalance derate", "motor
overheating"); the id appended to the existing `POWERQUALITY_RENDERERS` declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
the 1.1% example, the 3.45% cross-check, the >5% flag, and error seams (non-finite, any voltage <= 0).
Raise the `calc-powerquality.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the >5% flag path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
unbalance percent, the derate factor, and the flag wrap on a phone); render-no-nan + a11y sweep,
output read to the value (460/455/450 -> 1.10% -> ~0.98; >5% -> do not operate).

## 5. Roadmap position

Turns the existing `voltage-imbalance` measurement into the MG-1 action it implies, alongside the
motor family (`motor-fla`, `motor-vd-starting`). Further Group A growth stays evidence-driven.
