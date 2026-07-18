# roughlogic.com Specification v958 -- Hydrostatic DP Level Transmitter (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-lowvoltage.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v957.md. Instrumentation / controls install-ops
> sweep, beside the accepted `loop-signal-scaling`, `rtd-resistance-to-temp`, and `pulse-flowmeter-k-factor` tiles.
>
> **The gap, and the evidence for it.** The catalog scales a 4-20 mA loop and reads RTD/thermistor/flowmeter outputs, but
> nothing converts a hydrostatic head to a liquid level -- the DP level transmitter every instrumentation and tank tech
> calibrates. Grep confirmed no level-transmitter / tank-level / hydrostatic-level tile (the "hydrostatic" hits are fire
> and plumbing hydrostatic TESTS, a different thing). The number this settles: a tap reading **4.33 psi** in water is
> **10 ft** of level.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing psi, SG, and feet), bounds-fuzzer, worked-
example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a negative pressure, or a
non-positive specific gravity or max level returns `{ error }`; zero pressure is a valid empty tank. Citation discipline
(v19/v22): the hydrostatic head relation by name (P = 0.433 x SG x H), `GOVERNANCE.general`; the note states that 0.433
psi/ft is water at ~60 F, that the tile assumes an open (vented) tank with the tap at zero level and no elevation/
suppression -- a dry-leg tap needs zero suppression and a wet-leg sealed tank needs zero elevation, set at calibration --
and that the SG is at operating temperature; the transmitter's configured range and calibration and the tank geometry
govern.

## 2. The tile

### 2.1 `dp-level-hydrostatic` -- Hydrostatic DP Level Transmitter (Head to Level)

```
inputs:
  measured_pressure_psi  measured hydrostatic pressure at the bottom tap (psi), default 4.33
  specific_gravity       fluid specific gravity (water = 1.0), default 1.0
  max_level_ft           full-span (URV) level of the tank (ft), default 20

level_ft   = measured_pressure_psi / (0.433 x specific_gravity)      [0.433 psi/ft = water at ~60 F]
level_in   = level_ft x 12
span_psi   = 0.433 x specific_gravity x max_level_ft                 [URV pressure at full level]
level_pct  = 100 x level_ft / max_level_ft
```

**Pinned worked example.** 4.33 psi in water (SG 1.0), 20-ft tank: `level = 4.33/(0.433 x 1.0) = ` **10 ft** (120 in),
the full-span pressure is `0.433 x 1.0 x 20 = ` **8.66 psi**, so 4.33 psi is **50% of span**. Cross-check: the same 4.33
psi in a denser **1.2-SG** fluid is only `4.33/(0.433 x 1.2) = ` **8.33 ft** -- a heavier fluid makes more pressure per
foot.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage", "water"]`, beside `thermistor-beta-temp`); a `tile-meta.js`
`_TILES` entry (`A`); a `citations.js` entry (hydrostatic head, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the water example plus the denser-fluid cross-check, pinning the level, percent, and span); `test/
fixtures/compute-map.js` (`dp-level-hydrostatic` -> `computeDpLevelHydrostatic`, module `../../calc-lowvoltage.js`);
`scripts/related-tiles.mjs` (-> `loop-signal-scaling` / `pulse-flowmeter-k-factor` / `tank-volume`); `data/search/
aliases.json` (5 collision-checked aliases: "dp level transmitter", "hydrostatic level", "tank level pressure", "level
from pressure", "head to level"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`LOWVOLTAGE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-lowvoltage declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning the level, span, and percent, the denser-fluid direction, the empty-tank
zero, the pressure/SG linearity, and the error seams. The calc-lowvoltage.js gzip cap and the Group A group shell are
watched at build. Home tile count 1,406 -> 1,407.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(4.33 psi / SG 1.0 / 20 ft -> 10 ft, 50%).

## 5. Roadmap position

Instrumentation / controls install-ops beside `loop-signal-scaling`, serving the instrumentation tech / tank operator
(low-voltage / water). Deliberately the open-tank hydrostatic head; a dry-leg (zero suppression) or wet-leg (zero
elevation) install, the operating-temperature SG, and the transmitter's configured range and calibration govern the
reading. Stays evidence-driven. Continues the instrumentation / controls install-ops sweep at 1 new spec (v958).
