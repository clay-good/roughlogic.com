# roughlogic.com Specification v933 -- Resistance / Spot-Welder Branch-Circuit Conductor and OCPD (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v932.md. Electrician special-equipment sweep,
> beside the accepted `welder-arc-circuit-conductor` (spec-v932) tile.
>
> **The gap, and the evidence for it.** The catalog now sizes the ARC-welder circuit (630.11/630.12) but not the
> RESISTANCE (spot) welder circuit, which uses a different NEC method (630.31/630.32) with a 300% OCPD instead of 200%.
> Grep confirmed no 630.31 tile. The number this settles: a 100 A primary, 50%-duty spot welder needs **70.7 A**
> conductors on up to a **300 A** device.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the sibling
arc-welder tile: the primary, conductor, and OCPD currents carry `I`, and the duty and multiplier are dimensionless. The
v18/v21 contract: a non-finite or non-positive primary current, or a duty cycle outside 0 to 100 percent, returns
`{ error }`. Citation discipline (v19/v22): the NEC 630.31/630.32 method by name (conductor = primary x sqrt(duty) per
630.31(A)(2); OCPD <= 300% of primary per 630.32(A)), `GOVERNANCE.general`; the note states that a resistance welder
fires in brief pulses so the conductor takes the same duty derating as an arc welder, that the OCPD is allowed to 300%
(higher than the arc welder's 200%) so the pulses do not nuisance-trip it, and that the welder nameplate, the AHJ, and
the adopted NEC edition govern.

## 2. The tile

### 2.1 `welder-resistance-circuit-conductor` -- Resistance / Spot-Welder Branch-Circuit Conductor and OCPD (NEC 630.31)

```
inputs:
  primary_current_a  nameplate rated primary current (A)
  duty_pct           rated duty cycle (%, default 50)

duty_multiplier     = sqrt(duty_pct / 100)   (NEC 630.31(A)(2))
conductor_current_a = primary_current_a x duty_multiplier
ocpd_max_a          = 3.0 x primary_current_a   (NEC 630.32(A))
```

**Pinned worked example.** 100 A primary, 50% duty:
`multiplier = sqrt(0.50) = 0.71`; `conductor = 100 x 0.71 = ` **70.7 A** (a #4 Cu, 85 A at 75 C); `OCPD <= 3.0 x 100 = `
**300 A**. Cross-check: a 60 A primary at 20% duty gets `sqrt(0.20) = 0.45`, so `conductor = 26.8 A` on up to `3.0 x 60 =
` **180 A** -- the same duty derating as the arc-welder tile, but the OCPD ceiling is 300% here versus 200% there.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "welding"]`, beside `welder-arc-circuit-conductor`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (NEC 630.31 / 630.32 method, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 50%-duty example plus the 20%-duty cross-check, pinning the conductor and OCPD);
`test/fixtures/compute-map.js` (`welder-resistance-circuit-conductor` -> `computeWelderResistanceCircuitConductor`, module
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `welder-arc-circuit-conductor` / `wire-ampacity` /
`weld-duty-cycle`); `data/search/aliases.json` (5 collision-checked aliases: "spot welder circuit", "resistance welder
circuit", "spot welder conductor size", "resistance welder breaker", "seam welder circuit"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `ELECTRICAL_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the conductor current and 300% OCPD across two duties and the error seams (non-positive primary, duty out of
range, non-finite). The calc-electrical.js gzip cap and the Group A group shell are watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,381 -> 1,382.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(100 x sqrt(0.50) -> 70.7 A conductor, 300 A max OCPD).

## 5. Roadmap position

Electrician special-equipment tile beside `welder-arc-circuit-conductor`, serving the electrician / welder (electrical /
welding). Completes the NEC Article 630 welder-circuit pair (arc 630.11/630.12, resistance 630.31/630.32). Deliberately
applies the NEC method; the welder nameplate, the AHJ, and the adopted NEC edition govern. Stays evidence-driven.
Continues the electrician special-equipment sweep at 1 new spec (v933).
