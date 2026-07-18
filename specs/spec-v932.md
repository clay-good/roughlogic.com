# roughlogic.com Specification v932 -- Arc-Welder Branch-Circuit Conductor and OCPD (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v931.md. Electrician special-equipment sweep,
> beside the accepted `wire-ampacity` and `weld-duty-cycle` tiles.
>
> **The gap, and the evidence for it.** The catalog has the welder DUTY-CYCLE (NEMA EW-1) tile but nothing sizes the
> welder BRANCH CIRCUIT to the NEC. Grep confirmed no NEC 630 tile. Every shop welder needs a circuit sized off its
> nameplate and duty. The number this settles: a 40 A primary, 50%-duty arc welder needs conductors rated **28.3 A** on
> up to an **80 A** breaker.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
electrical tiles: the primary, effective, and OCPD currents carry `I`, and the duty and multiplier are dimensionless. The
v18/v21 contract: a non-finite or non-positive primary current, or a duty cycle outside 0 to 100 percent, returns
`{ error }`. Citation discipline (v19/v22): the NEC 630 welder-circuit method by name (I_eff = primary x sqrt(duty) per
Table 630.11(A); OCPD <= 200% of primary per 630.12(A)), `GOVERNANCE.general`; the note states that the conductor is
sized on an effective current because a low-duty welder heats the wire less, that the OCPD may run to 200% of the rated
primary (next size down if 200% is not standard), that resistance (spot) welders use the separate 630.31 / 630.32 method
at 300%, and that the welder nameplate, the AHJ, and the adopted NEC edition govern.

## 2. The tile

### 2.1 `welder-arc-circuit-conductor` -- Arc-Welder Branch-Circuit Conductor and OCPD (NEC 630.11)

```
inputs:
  primary_current_a  nameplate rated primary current (A)
  duty_pct           rated duty cycle (%, default 50)

duty_multiplier    = sqrt(duty_pct / 100)   (NEC Table 630.11(A))
effective_current_a = primary_current_a x duty_multiplier
ocpd_max_a         = 2.0 x primary_current_a   (NEC 630.12(A))
```

**Pinned worked example.** 40 A primary, 50% duty:
`multiplier = sqrt(0.50) = 0.71`; `I_eff = 40 x 0.71 = ` **28.3 A** (size a #10 Cu, 30 A at 60 C); `OCPD <= 2.0 x 40 = `
**80 A**. Cross-check: a 60 A primary at 100% duty gets the full `sqrt(1.0) = 1.0` multiplier, so `I_eff = 60 A` and
`OCPD <= 120 A` -- a continuous-duty welder gets no conductor reduction, while a 20%-duty welder's conductor drops to
`sqrt(0.20) = 0.45` of the primary.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "welding"]`, beside `microinverter-branch-count`); a
`tile-meta.js` `_TILES` entry (`A`); a `citations.js` entry (NEC 630.11 / 630.12 method, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 50%-duty example plus the 100%-duty cross-check, pinning the effective current
and OCPD); `test/fixtures/compute-map.js` (`welder-arc-circuit-conductor` -> `computeWelderArcCircuitConductor`, module
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `wire-ampacity` / `weld-duty-cycle` /
`motor-branch-protection`); `data/search/aliases.json` (5 collision-checked aliases: "arc welder circuit", "welder
conductor size", "welder breaker size", "welder duty cycle conductor", "shop welder circuit"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `ELECTRICAL_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the duty multiplier, effective current, OCPD, and the monotonicity in duty, plus the error seams (non-positive
primary, duty out of range, non-finite). The calc-electrical.js gzip cap is raised 88000 -> 92000 with a ledger note.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,380 -> 1,381.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build (cap
raise); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(40 x sqrt(0.50) -> 28.3 A effective, 80 A max OCPD).

## 5. Roadmap position

Electrician special-equipment tile beside `weld-duty-cycle`, serving the electrician / welder (electrical / welding).
Deliberately applies the NEC method; the welder nameplate, the AHJ, and the adopted NEC edition govern. Resistance
(spot) welders are a future sibling (630.31 / 630.32). Stays evidence-driven. Continues the electrician special-equipment
sweep at 1 new spec (v932).
