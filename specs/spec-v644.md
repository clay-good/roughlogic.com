# roughlogic.com Specification v644 -- Fuel-Gas Pipe Capacity from Allowable Drop (calc-gas.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`**
> (Group B, plumbing/gas), no new module, group, or dependency. Inherits spec.md through spec-v643.md.
>
> **The gap, and the evidence for it.** The `gas-pipe-pressure-drop` tile (spec-v20 B.3) computes the Spitzglass
> low-pressure drop for a given flow: `dH = (Q/3550)^2 x SG x L x K' / D^5`, `K' = 1 + 3.6/D + 0.03 D`. The reverse
> question -- "the line is 1 inch and I can spend 0.5 in w.c.; how much gas does it carry?" -- is the same
> Spitzglass relation solved for the flow, `Q = 3550 x sqrt(dH x D^5 / (SG x L x K'))`, no iteration. It complements
> `gas-pipe-sizing`, which picks a size from the NFPA 54 / IFGC capacity tables; this is the longhand capacity of a
> pipe already in the wall. The pinned example: a 1 inch bore (ID 1.049), 100 ft, 0.60 SG natural gas at a 0.5 in
> w.c. allowable drop carries **173 CFH** at **480 ft/min**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The allowable drop is
`M L^-1 T^-2` (in w.c.), the bore and length are `L`, the specific gravity is `dimensionless`, the flow is
`L^3 T^-1` (CFH), and the velocity is `L T^-1`. The Spitzglass constant `3550` and the diameter factor
`1 + 3.6/D + 0.03 D` are the same ones the `gas-pipe-pressure-drop` sibling already uses. The v18/v21 contract
(mirroring the forward tile's inline finite checks, not `_finiteGuard`): a non-finite or non-positive drop,
diameter, length, or specific gravity returns `{ error }`. As in the forward tile, a drop above the ~1.5 psi
(41.5 in w.c.) low-pressure validity range sets an `exceeds_low_pressure` flag and a note directing the user to the
high-pressure compressible form. Citation discipline (v19/v22): the Spitzglass equation solved for the flow, the
inverse of the pressure-drop tile, by name; the note states that **the inside diameter must be the actual bore, not
nominal, this is a longhand alternative to the NFPA 54 / IFGC capacity tables, and NFPA 54 governs the
installation**.

## 2. The tile

### 2.1 `gas-pipe-max-flow` -- The Flow a Gas Bore Carries Within an Allowable Drop

```
inputs:
  drop_inwc   in w.c.   allowable pressure drop (> 0)
  id_in       in        actual inside bore (> 0)
  length_ft   ft        pipe length (> 0)
  sg          -         gas specific gravity (> 0; 0.60 natural gas, 1.50 propane)

K'         = 1 + 3.6/D + 0.03 D
flow_cfh   = 3550 x sqrt(dH x D^5 / (SG x L x K'))
velocity   = flow_cfh / ((pi/4)(D/12)^2) / 60          [ft/min]
```

**Pinned worked example.** dH = 0.5 in w.c., D = 1.049 in, L = 100 ft, SG = 0.60: `K' = 1 + 3.6/1.049 +
0.03 x 1.049 = 4.463`, `flow = 3550 x sqrt(0.5 x 1.270 / (0.6 x 100 x 4.463)) = ` **173 CFH** at **480 ft/min**.
**Cross-check (exact inverse of the drop tile).** The `gas-pipe-pressure-drop` tile computes ~16.73 in w.c. for
1,000 CFH at these dimensions; feeding 16.73 in w.c. back here recovers **~1,000 CFH** (the fuzzer runs this through
the actual `computeGasPipePressureDrop` and recovers 1,000 to 1e-6).
**Cross-check (sqrt-drop scaling).** Quadrupling the allowable drop to 2.0 in w.c. doubles the capacity to
**~346 CFH** -- the flow scales with `sqrt(dH)`.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `gas-pipe-pressure-drop`; the id is
`gas-pipe-max-flow`, deliberately distinct from the existing `gas-pipe-capacity.json` NFPA-table data shard); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (Spitzglass solved for flow, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example plus the round-trip cross-check); `test/fixtures/compute-
map.js` (`gas-pipe-max-flow` -> `computeGasPipeMaxFlow`); `scripts/related-tiles.mjs` (<-> `gas-pipe-pressure-drop`,
`gas-pipe-sizing`, `gas-leak-rate`, `gas-appliance-demand`); `data/search/aliases.json` ("gas pipe capacity", "gas
pipe max flow", "spitzglass capacity", plus question rows, all collision-checked); `GAS_RENDERERS["gas-pipe-max-
flow"]` via a hand-written renderer (the module's `makeNumber` / `makeOutputLine` / `attachExampleButton` /
`debounce` / `fmt` helpers, mirroring `gas-pipe-pressure-drop`) and the id added to the calc-gas declare list in
`app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, the exact inverse round-trip through
`computeGasPipePressureDrop`, the `sqrt(dH)` scaling, the low-pressure flag, and the error seams. The two
`index.html` home-count spots go 1,092 -> 1,093 (check-readme-counts gates them). The calc-gas.js gzip cap is
expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> 173 CFH, 480 ft/min).

## 5. Roadmap position

Completes the Spitzglass pair: `gas-pipe-pressure-drop` (flow -> drop) and now `gas-pipe-max-flow` (drop -> flow),
exact inverses through the same equation, and a longhand companion to the table-based `gas-pipe-sizing`. Further
Group B / gas growth stays evidence-driven.
