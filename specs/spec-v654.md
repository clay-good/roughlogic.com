# roughlogic.com Specification v654 -- Motor Pole Count from Nameplate RPM (calc-motor.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-motor.js`**
> (Group A, electrical), no new module, group, or dependency. Inherits spec.md through spec-v653.md.
>
> **The gap, and the evidence for it.** The `motor-synchronous-speed-slip` tile (spec-v121) requires the pole
> count as an input. But a tech reading a nameplate has the full-load rpm, not the poles -- the pole count is the
> unknown. Because the synchronous speed sits just above the running speed, inverting `Ns = 120 f / P` identifies
> it: `pole-pairs = round(60 f / rpm)`, `poles = 2 x pole-pairs`. First-principles, deterministic rounding, no
> table. The pinned example: a **1750 rpm** 60 Hz motor is a **4-pole** machine (Ns 1800, 2.78% slip); 1150 rpm is
> 6-pole, 3450 rpm is 2-pole.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The rated and
synchronous speeds and the line frequency are `T^-1`; the pole count and slip are `dimensionless`. The `120`
(and `60`) unit-bridge constant is the same one `motor-synchronous-speed-slip` already uses. The v18/v21 contract:
any non-finite input, or a non-positive rpm or frequency, returns `{ error }`; a speed at or above the identified
synchronous speed (slip <= 0) sets an `at_or_above_sync` flag (an induction nameplate never shows this) but still
returns a number. Citation discipline (v19/v22): the synchronous-speed relation inverted for the poles, by name;
the note states that **poles = 2 x round(60 f / rpm), the synchronous speed sits just above the running speed, and a
zero/negative slip flags a bad rpm or frequency** -- the nameplate and the manufacturer govern.

## 2. The tile

### 2.1 `motor-pole-identification` -- The Pole Count and Slip from a Nameplate Speed

```
inputs:
  rated_rpm      rpm   nameplate full-load speed (> 0)
  line_freq_hz   Hz    line frequency (> 0; 60 US, 50 elsewhere)

pole_pairs = round(60 x line_freq_hz / rated_rpm)
poles      = max(2, 2 x pole_pairs)
sync_rpm   = 120 x line_freq_hz / poles
slip       = (sync_rpm - rated_rpm) / sync_rpm    (flag if <= 0)
```

**Pinned worked example.** `rpm = 1750`, `f = 60 Hz`: `pole-pairs = round(3600/1750) = round(2.06) = 2`, so
`poles = 4`, `Ns = 120 x 60 / 4 = ` **1800 rpm**, `slip = (1800-1750)/1800 = ` **2.78%**.
**Cross-check (other common speeds).** 1150 rpm -> 6-pole (Ns 1200); 3450 rpm -> 2-pole (Ns 3600); a 1450 rpm 50 Hz
motor -> 4-pole (Ns 1500).
**Cross-check (exact inverse of the sync-slip tile).** The fuzzer feeds the identified 4 poles back through
`motor-synchronous-speed-slip` at 1750 rpm and recovers the same 1800 rpm Ns and 2.78% slip; an over-synchronous
1800 rpm entry is flagged.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `motor-synchronous-speed-slip`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (sync-speed inverted, the note per §1); `test/fixtures/worked-examples.json`
(the pinned example plus the 6-pole cross-check); `test/fixtures/compute-map.js` (`motor-pole-identification` ->
`computeMotorPoleIdentification`); `scripts/related-tiles.mjs` (<-> `motor-synchronous-speed-slip`,
`motor-shaft-torque`, `motor-fla`, `motor-operating-cost`); `data/search/aliases.json` ("motor pole
identification", "how many poles is my motor", "pole count from rpm", plus question rows, all collision-checked);
`MOTOR_RENDERERS["motor-pole-identification"]` via a hand-written renderer (the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `motor-synchronous-speed-slip`)
and the id added to the calc-motor declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the exact inverse
round-trip through `computeMotorSyncSlip`, the common-speed snaps, the over-synchronous flag, and the error seams.
The two `index.html` home-count spots go 1,102 -> 1,103 (check-readme-counts gates them). The calc-motor.js gzip cap
is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 4-pole, Ns 1800 rpm, 2.78% slip).

## 5. Roadmap position

Completes the motor-speed pair: `motor-synchronous-speed-slip` (poles -> speed and slip) and now
`motor-pole-identification` (nameplate speed -> poles and slip), exact inverses through the same `Ns = 120 f / P`
relation. Further Group A / motor growth stays evidence-driven.
