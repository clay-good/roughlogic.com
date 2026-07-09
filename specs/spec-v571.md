# roughlogic.com Specification v571 -- Return Activated Sludge (RAS) Flow Rate (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, water and wastewater operations); no new module, group, or dependency. Inherits spec.md through spec-v570.md.
>
> **The gap, and the evidence for it.** The bench has SRT, SVI, and clarifier-loading tiles that describe an activated-
> sludge process, but not the return-pump rate an operator actually sets. The RAS flow that maintains the aeration
> basin's mixed-liquor solids comes from a solids mass balance: `Q_RAS = Q x MLSS / (RAS_SS - MLSS)`. The catch is that
> the clarifier only thickens the sludge three to four times, so `RAS_SS` is capped -- chasing a high MLSS by cranking
> the RAS pump just floods the clarifier and washes solids over the weir. The mass balance, not the pump's maximum, sets
> the rate, and the return solids concentration must exceed the mixed-liquor concentration or both the formula and the
> process break down. The tile takes the plant flow, the mixed-liquor solids, and the return solids, and returns the RAS
> flow and the return ratio -- the number the return pump is set to.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The plant flow and the RAS
flow are volumetric flows (`L^3 T^-1`, in MGD); the mixed-liquor and return suspended solids are mass concentrations
(`M L^-3`, in mg/L); the return ratio is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive
plant flow or mixed-liquor solids, or a return-solids concentration not greater than the mixed-liquor solids (the
clarifier cannot thicken to at or below the basin concentration) returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the mass-balance relation by name (WEF / Sacramento activated-sludge manuals); `editionNote`
names the **RAS flow from the solids mass balance**, prints `Q_RAS = Q x MLSS / (RAS_SS - MLSS)` and
`ratio = Q_RAS / Q x 100`, and states that **the clarifier only thickens sludge three to four times so the return
solids concentration is capped -- cranking the RAS pump to chase a higher MLSS floods the clarifier and washes solids
over the weir -- the mass balance not the pump maximum sets the rate, the return solids must exceed the mixed-liquor
solids, and the settleability and clarifier performance govern** -- an operating aid, not a process design.

## 2. The tile

### 2.1 `ras-flow-rate` -- The Return Rate the Mass Balance Sets (Not the Pump's Maximum)

```
inputs:
  plant_flow_mgd   MGD    influent flow Q
  mlss_mg_l        mg/L   mixed-liquor suspended solids (target)
  ras_ss_mg_l      mg/L   return activated sludge suspended solids (> MLSS)

Q_RAS_mgd  = plant_flow_mgd x mlss_mg_l / (ras_ss_mg_l - mlss_mg_l)     [MGD]
ras_ratio  = Q_RAS_mgd / plant_flow_mgd x 100                          [%]
```

**Pinned worked example (a 5 MGD plant holding 2,500 mg/L MLSS with 8,000 mg/L return solids).**
`Q_RAS = 5 x 2,500 / (8,000 - 2,500) = 12,500 / 5,500 = ` **2.27 MGD**, a return ratio of
`2.27 / 5 x 100 = ` **45%** -- a normal return rate that holds the basin at 2,500 mg/L. **Cross-check (a poorly
thickening clarifier forces a much higher return).** If the sludge only thickens to `6,000 mg/L` return solids:
`Q_RAS = 5 x 2,500 / (6,000 - 2,500) = 12,500 / 3,500 = ` **3.57 MGD**, a **71%** return ratio -- far more pumping for
the same basin concentration, and pushing it higher would overload the clarifier. The tile returns the RAS flow and the
return ratio.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["wastewater"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the base example + the poor-
thickening cross-check); `test/fixtures/compute-map.js` (`ras-flow-rate` -> `computeRasFlowRate` in
`../../calc-water.js`); `scripts/related-tiles.mjs` (-> `srt-fm-ratio` / `svi-sludge-index` /
`clarifier-surface-loading`); `data/search/aliases.json` ("ras flow", "return activated sludge", "ras ratio", "sludge
return rate", "mlss mass balance", "ras pump rate", "return sludge flow", "activated sludge return"); the id appended to
the water renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the mass-balance relation, the return ratio, the RAS_SS > MLSS
requirement, and the error seams (non-finite, non-positive flow / MLSS, RAS_SS <= MLSS). Hand-writes its renderer
(mirroring the calc-water.js `srt-fm-ratio` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the Q_RAS / ratio stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the base example -> 2.27 MGD, 45%).

## 5. Roadmap position

Adds the return-pump rate beside `srt-fm-ratio` and `svi-sludge-index` (which describe the same process), and pairs with
`was-srt-control` (the wasting decision). A settleability-based RAS (from the SVI) and a step-feed RAS split are
deliberate future follow-ons. Further Group M growth stays evidence-driven.
