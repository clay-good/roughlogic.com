# roughlogic.com Specification v978 -- Compressor Volumetric Efficiency (Clearance Re-Expansion) (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`** (Group
> C), no new module, group, or dependency. Inherits spec.md through spec-v977.md. Refrigeration sweep, directly beside
> the accepted `compressor-displacement` tile.
>
> **The gap, and the evidence for it.** `compressor-displacement` computes the swept-volume ceiling and EXPLICITLY names
> the volumetric efficiency it cannot compute; nothing fills it (the group-K `volumetric-efficiency` is engine
> induction). Grep confirmed no refrigeration clearance-VE tile. The number this settles: a 0.045-clearance compressor at
> a 4.3 compression ratio on R-22 has a clearance VE of about **88%**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing a ratio, psia, and an exponent), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a negative clearance, a
non-positive suction pressure or exponent, or a discharge pressure at or below suction (compression ratio not above 1)
returns `{ error }`. Citation discipline (v19/v22): the clearance re-expansion relation by name (ASHRAE Refrigeration /
Dossat), `GOVERNANCE.general`; the note explains that a higher compression ratio lowers VE (why capacity falls on a
high-lift day), that this is the CLEARANCE VE only -- the actual VE is lower from suction superheating, leakage, and
valve pressure drop -- and that the manufacturer's rated capacity at the operating condition governs.

## 2. The tile

### 2.1 `compressor-volumetric-efficiency` -- Compressor Volumetric Efficiency (Clearance Re-Expansion)

```
inputs:
  clearance_ratio         clearance volume / swept volume (~0.03-0.06), default 0.045
  suction_pressure_psia   suction (absolute) pressure (psia), default 70
  discharge_pressure_psia discharge (absolute) pressure (psia), default 300
  polytropic_exponent     re-expansion exponent n (~1.11 R-22, 1.16 R-410A), default 1.11

compression_ratio        = discharge_pressure_psia / suction_pressure_psia
volumetric_efficiency_pct = 100 x (1 + clearance_ratio - clearance_ratio x compression_ratio^(1/polytropic_exponent))
```

**Pinned worked example.** C 0.045, 70/300 psia, R-22 n 1.11: compression ratio = `300/70 = ` **4.29**, VE = `100 x (1 +
0.045 - 0.045 x 4.286^(1/1.11)) = ` **87.8%**. Cross-check: raising the head to **400 psia** raises the ratio to 5.71 and
drops the clearance VE to `100 x (1 + 0.045 - 0.045 x 5.714^(1/1.11)) = ` **82.9%** -- more lift, less capacity.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "refrigeration"]`, beside `compressor-displacement`); a `tile-
meta.js` `_TILES` entry (`C`); a `citations.js` entry (clearance re-expansion / ASHRAE / Dossat, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base example plus the higher-head cross-check, pinning the ratio and VE);
`test/fixtures/compute-map.js` (`compressor-volumetric-efficiency` -> `computeCompressorVolumetricEfficiency`, module
`../../calc-refrigerant.js`); `scripts/related-tiles.mjs` (-> `compressor-displacement` / `refrigerant-mass-flow` /
`refrigeration-cop`); `data/search/aliases.json` (5 collision-checked aliases: "compressor volumetric efficiency",
"clearance volumetric efficiency", "compressor efficiency", "clearance ratio", "recip compressor ve"), then `node
scripts/build-alias-shards.mjs`; a hand-written renderer in the `REFRIGERANT_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-refrigerant declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the compression ratio and VE, the higher-head and larger-clearance directions, the zero-clearance 100% identity,
and the error seams. The calc-refrigerant.js gzip cap and the Group C group shell are watched at build. Home tile count
1,426 -> 1,427.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.045 / 70 / 300 / 1.11 -> 4.29 ratio, 87.8%).

## 5. Roadmap position

Refrigeration beside `compressor-displacement`, serving the refrigeration / HVAC service tech (hvac / refrigeration).
Deliberately the clearance VE; the actual VE (lower, from suction superheating, valve/ring leakage, and valve pressure
drop) and the manufacturer's rated capacity at the operating condition govern. Stays evidence-driven. Continues the
refrigeration sweep at 1 new spec (v978).
