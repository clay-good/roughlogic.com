# roughlogic.com Specification v600 -- Settleability-Based RAS Rate From SVI (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, the water/wastewater operations bench); no new module, group, or dependency. Inherits spec.md through
> spec-v599.md.
>
> **The gap, and the evidence for it.** Spec-v571 (`ras-flow-rate`) names this tile as a deliberate follow-on:
> "A settleability-based RAS (from the SVI)." The mass-balance RAS tile needs the operator to supply a **measured**
> return-solids concentration, but on most days the operator does not have a fresh RAS_SS lab result -- what they do
> have, from the settleometer run they do every shift, is the sludge volume index. The settleability sets the ceiling
> on how far the clarifier can thicken the sludge: the achievable return concentration is about
> **Xr = 1,000,000 / SVI** in mg/L, so a well-settling sludge at SVI 100 thickens to 10,000 mg/L, but a bulking sludge
> at SVI 150 only reaches 6,700 mg/L. Feed that into the same mass balance and the RAS ratio for a target mixed-liquor
> concentration is `R = MLSS / (Xr - MLSS)`. The tile makes the operating lesson unavoidable: **poor settling forces a
> much higher return rate.** Holding 2,500 mg/L MLSS on a good SVI of 100 needs only a 33% return, but a bulking sludge
> at SVI 150 wanting 3,000 mg/L needs an **82%** return -- and if the pumps cannot deliver it, the MLSS target is
> simply unreachable until the settling recovers. It gives the RAS number straight from the settleometer, no RAS_SS lab
> result required.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The plant flow is
`L^3 T^-1` (MGD), the MLSS and the derived return concentration `M L^-3` (mg/L), the SVI `L^3 M^-1` (mL/g, carried
dimensionless to the parse-only lint like the `svi-sludge-index` sibling), and the RAS ratio `dimensionless`. The
v18/v21 contract: any non-finite input, a non-positive plant flow, MLSS, or SVI, or an SVI so high that the achievable
return concentration does not exceed the MLSS (the clarifier cannot thicken past the basin) returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the settleability-based RAS relation by name (WEF / Sacramento
activated-sludge operator practice, matching the `ras-flow-rate` and `svi-sludge-index` siblings); `editionNote` prints
`Xr = 1,000,000 / SVI`, `R = MLSS / (Xr - MLSS)`, and `Q_RAS = R x Q`, and states that **the achievable return
concentration is the settleability ceiling not a guaranteed value (clarifier depth, loading, and temperature move it),
poor settling forces a higher return rate and a bulking sludge can make a target MLSS unreachable within the pump
capacity, this is the settleometer path to the same mass balance `ras-flow-rate` does from a measured RAS_SS, and the
settleability and clarifier performance govern** -- an operating aid, not a process design.

## 2. The tile

### 2.1 `ras-svi-settleability` -- RAS Ratio and Flow From the Sludge Volume Index

```
inputs:
  plant_flow_mgd   MGD    plant influent flow Q
  mlss_mg_l        mg/L   target mixed-liquor solids
  svi_ml_g         mL/g   sludge volume index (from the settleometer)

achievable_ras_ss_mg_l = 1,000,000 / svi_ml_g                       [mg/L]
ras_ratio              = mlss_mg_l / (achievable_ras_ss_mg_l - mlss_mg_l)    [--]
q_ras_mgd              = ras_ratio x plant_flow_mgd                  [MGD]
```

**Pinned worked example (a well-settling sludge: 4 MGD, 2,500 mg/L MLSS, SVI 100).**
`Xr = 1,000,000 / 100 = ` **10,000 mg/L** achievable return. `R = 2,500 / (10,000 - 2,500) = 2,500 / 7,500 = ` **33%**
return, so `Q_RAS = 0.333 x 4 = ` **1.33 MGD** -- a comfortable pump setting. **Cross-check (a bulking sludge forces a
much higher return).** 5 MGD, 3,000 mg/L MLSS, SVI 150: `Xr = 1,000,000 / 150 = 6,667 mg/L`,
`R = 3,000 / (6,667 - 3,000) = 3,000 / 3,667 = ` **82%** return, `Q_RAS = 0.818 x 5 = ` **4.09 MGD** -- nearly matching
the plant flow, and if the RAS pumps top out below that the 3,000 mg/L target is unreachable until the sludge settles
better. Both confirm the return rate climbs steeply as settling degrades, exactly the operating trap the tile exists to
flag.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["wastewater"]`, placed inside the Group M comment block beside
`ras-flow-rate` -- the `citations.test.js` **Group M audit count bumps 28 -> 29**); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`ras-svi-settleability` -> `computeRasSviSettleability` in
`../../calc-water.js`); `scripts/related-tiles.mjs` (-> `ras-flow-rate` / `svi-sludge-index` / `srt-fm-ratio`);
`data/search/aliases.json` ("ras from svi", "settleability ras", "sludge volume index ras", "return rate from svi",
"ras ratio settleometer", plus question rows); the id appended to the calc-water declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the SVI-drives-ratio behavior, and the error seams (non-finite, non-positive flow / MLSS / SVI,
and an SVI too high to thicken past the MLSS). Renderer uses the module's `_v23SimpleRenderer` factory (mirroring
`ras-flow-rate`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group M audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the SVI-100 example
-> 33% return / 1.33 MGD).

## 5. Roadmap position

Gives `ras-flow-rate` its settleometer counterpart -- the RAS number when the only data on hand is the SVI -- alongside
`svi-sludge-index` and `was-srt-control`. The v571-named step-feed RAS split remains a deliberate future follow-on.
Further Group M growth stays evidence-driven.
