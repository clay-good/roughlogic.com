# roughlogic.com Specification v332 -- Nail Withdrawal Design Value (NDS 12.2.3) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.117.0). Batch spec-v332..v334 (the wood-fastener withdrawal trio -- the NDS
> withdrawal design equations the "typical values" tile only tabulates: the nail (this spec), the lag screw (v333), and the
> wood screw (v334), each with its own empirical constant and penetration multiplier.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `fastener-pullout` reports typical pull-out values by
> fastener and species, but the NDS gives a reference withdrawal design value from the specific gravity and fastener
> diameter, times the penetration -- the actual design number for a nail loaded in withdrawal (a hurricane tie uplift, a
> ledger, a suspended load). Adds one tile to the existing **`calc-construction.js`** module (Group E); no new group, trade,
> or dependency. Inherits spec.md through spec-v331.md.
>
> **The gap, and the evidence for it.** NDS 12.2.3 gives the reference withdrawal design value per inch of penetration for a
> nail or spike as `W = 1,380 x G^(5/2) x D`, where `G` is the specific gravity of the holding member and `D` the fastener
> diameter (in), and the total withdrawal capacity is `W x p_pen`, the penetration into the member holding the point. For a
> 16d common nail (`D = 0.162 in`) in Douglas Fir-Larch (`G = 0.50`), `W = 1,380 x 0.50^2.5 x 0.162 = 39.5 lb/in`, so a
> 1.5 in penetration holds `39.5 x 1.5 = 59 lb` before the load-duration and toenail adjustments -- the number a framer's
> "nails don't hold in withdrawal" instinct is quantifying, and one `fastener-pullout` only estimates from a table. This
> tile computes it from the governing NDS equation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The specific gravity `G` is
dimensionless; the fastener diameter `D` and the penetration `p` are lengths (in); the reference withdrawal value `W` is a
force per length (lb/in); the withdrawal capacity is a force (lb); the load-duration `CD` and toenail `Ctn` factors are
dimensionless. The v18/v21 contract: any non-finite input, or a specific gravity, diameter, or penetration at or below
zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the NDS 12.2.3 nail-withdrawal equation
by name; `editionNote` names **the NDS 2018 12.2.3 reference withdrawal `W = 1,380 G^(5/2) D` (lb/in), the capacity
`W x p_pen`, the toenail factor `Ctn = 0.67` (12.5.4), and that withdrawal from end grain is not permitted (12.2.3.4)**, and
states that **this returns the reference nail-withdrawal design value and capacity -- it applies to a nail loaded in
withdrawal from side grain (not end grain), uses the holding member's specific gravity, multiplies by the entered `CD` and
`Ctn`, and does not cover lateral (shear) loading (the NDS yield-limit model, `wood-bolt-connection`), the head pull-through,
or a nail in withdrawal combined with lateral; and this is a design aid, not a substitute for the engineer of record** --
the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `wood-nail-withdrawal` -- Nail Withdrawal Design Value (NDS 12.2.3)

```
inputs:
  G       -    specific gravity of the holding member (0.50 DF-L, 0.42 SPF)
  D_in    in   nail diameter (16d common = 0.162)
  p_in    in   penetration into the member holding the point
  CD      -    load-duration factor (default 1.0; 1.6 wind/seismic)
  toenail -    toenailed? (Ctn = 0.67)

W = 1380 * G^2.5 * D_in                           ; reference withdrawal, lb/in
Ctn = toenail ? 0.67 : 1.0
Z_w = W * p_in * CD * Ctn                         ; withdrawal capacity, lb
```

**Pinned worked example (a 16d common nail in DF-L, 1.5 in penetration).** `G = 0.50`, `D = 0.162`, `p = 1.5`, `CD = 1.0`,
face-nailed: `W = 1,380 x 0.50^2.5 x 0.162 = 39.5 lb/in`; `Z_w = 39.5 x 1.5 = 59 lb`. **Cross-check (toenailed, wind
uplift).** Same nail toenailed with `CD = 1.6` (wind): `Z_w = 39.5 x 1.5 x 1.6 x 0.67 = 64 lb` -- the toenail penalty
(0.67) nearly cancels the wind-duration bump, the reason toenailed uplift connections are weak and why framing hardware
replaces them. The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`, matching the wood fastener tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the NDS 12.2.3 equation, `editionNote` naming
`W = 1,380 G^2.5 D`, the `W x p` capacity, `Ctn = 0.67`, the no-end-grain rule, and the side-grain, not-lateral caveats);
`test/fixtures/worked-examples.json` (the face-nailed example + the toenail cross-check); `test/fixtures/compute-map.js`
(`wood-nail-withdrawal` -> `computeWoodNailWithdrawal` in `../../calc-construction.js`); `scripts/related-tiles.mjs` (->
`fastener-pullout` / `wood-lag-withdrawal` / `wood-screw-withdrawal` / `wood-bolt-connection`);
`data/search/aliases.json` ("nail withdrawal", "nail pull out", "NDS 12.2.3", "toenail capacity", "nail uplift", "16d
withdrawal", "nail holding power", "withdrawal design value", "nail specific gravity"); the id appended to the existing
construction renderers block in `app.js`; the `// dims:` annotation (`G`/`CD`/`Ctn` dimensionless, `D`/`p` length, `W`
force/length, `Z_w` force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
`G^2.5` sensitivity, the toenail and `CD` factors, and the non-positive / non-finite error seams. No new module; re-pin
`calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `G^2.5` and factor assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `W` / `Z_w` pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (16d in DF-L, 1.5 in -> 39.5 lb/in, 59 lb).

## 5. Roadmap position

Opens the wood-fastener withdrawal batch (v332..v334) in `calc-construction.js`, computing the NDS equation the typical-
value tile only tabulates. The lag screw (v333) and wood screw (v334) withdrawal follow. The nail lateral yield-limit value,
the head pull-through, and the combined withdrawal-plus-lateral interaction are the deliberate next follow-ons once the trio
lands.
