# roughlogic.com Specification v957 -- Insulation Resistance PI / DAR (Megger Test) (calc-service.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-service.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v956.md. Electrical-maintenance sweep.
>
> **The gap, and the evidence for it.** The catalog has grounding, ampacity, and service sizing, but nothing interprets
> the timed insulation-resistance (megger) test every motor/transformer PM turns on. Grep confirmed no polarization-index
> / dielectric-absorption tile ("megger" appears only in the grounding tiles' notes). The number this settles: an
> 800/1,040/4,160 Mohm test gives a **PI of 4.0**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since PI and DAR are ratios of Mohm readings),
bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or any
non-positive reading returns `{ error }`. Citation discipline (v19/v22): the polarization index and dielectric
absorption ratio by name (IEEE 43), `GOVERNANCE.general`; the note states that DAR = IR(60 s)/IR(30 s) and PI = IR(10
min)/IR(1 min) (the 1-minute and 60-second readings are the same), gives the IEEE 43 interpretation bands, and stresses
that this is a TREND/screen -- readings must be temperature-corrected to a common base, and PI loses meaning on
very-high-IR epoxy windings -- so the baseline trend and OEM criteria govern.

## 2. The tile

### 2.1 `insulation-resistance-pi` -- Insulation Resistance PI / DAR (Megger Test)

```
inputs:
  ir_30s_mohm    insulation resistance at 30 seconds (Mohm), default 800
  ir_1min_mohm   insulation resistance at 1 minute / 60 s (Mohm), default 1040
  ir_10min_mohm  insulation resistance at 10 minutes (Mohm), default 4160

dar                = ir_1min_mohm / ir_30s_mohm     [DAR = IR(60s)/IR(30s)]
polarization_index = ir_10min_mohm / ir_1min_mohm   [PI = IR(10min)/IR(1min)]
verdicts per IEEE 43: PI < 1 dangerous, 1-2 questionable, 2-4 good, > 4 excellent; DAR < 1 poor, 1-1.25 questionable, 1.25-1.4 acceptable, 1.4+ good
```

**Pinned worked example.** 800 / 1,040 / 4,160 Mohm: `DAR = 1040/800 = ` **1.30** (acceptable), `PI = 4160/1040 = ` **4.0**
(excellent). Cross-check: a flat 1,000 / 1,000 / 1,000 Mohm test (insulation not absorbing) gives **PI 1.0** and DAR 1.0
-- both questionable, the wet/contaminated signature -- and a falling reading drives PI below 1 (dangerous).

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, before `service-conductor-sizing`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (IEEE 43 PI/DAR, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the base
example plus the flat-reading cross-check, pinning PI and DAR); `test/fixtures/compute-map.js` (`insulation-resistance-
pi` -> `computeInsulationResistancePi`, module `../../calc-service.js`); `scripts/related-tiles.mjs` (-> `motor-overload-
sizing` / `soil-resistivity-wenner` / `grounding-electrode`); `data/search/aliases.json` (5 collision-checked aliases:
"polarization index", "insulation resistance test", "megger test", "dielectric absorption ratio", "pi dar test"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `SERVICE_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-service declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning PI and
DAR, the IEEE 43 verdict bands and their edges, the flat/falling-reading flags, and the error seams. The calc-service.js
gzip cap and the Group A group shell are watched at build. Home tile count 1,405 -> 1,406.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(800 / 1,040 / 4,160 -> DAR 1.30, PI 4.0).

## 5. Roadmap position

Electrical maintenance / testing, serving the electrician / motor-shop / test tech (electrical). Deliberately the PI/DAR
interpretation; the temperature correction, the machine baseline trend, the OEM acceptance criteria, and the test
standards (IEEE 43 / 95) govern the verdict. Stays evidence-driven. Continues the electrical field-test sweep at 1 new
spec (v957).
