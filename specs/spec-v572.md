# roughlogic.com Specification v572 -- WAS Rate to Hold Target SRT (Sludge Age) (calc-water.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, water and wastewater operations); no new module, group, or dependency. Inherits spec.md through spec-v571.md.
>
> **The gap, and the evidence for it.** `srt-fm-ratio` computes the sludge age from the current wasting, but the daily
> control decision runs the other way: how much sludge to waste **today** to hold a target SRT. The bench has no tile
> for that inverse. The solids in the system divided by the target SRT gives the pounds to leave the system each day;
> subtract the solids already leaving over the effluent weir, and the rest is the wasting the WAS pump must remove. The
> catch is that this is a **step change with a slow response**: SRT reacts over roughly one SRT (days), so over-
> correcting on a single day's reading chases the process. A second point operators miss: the solids carried out in the
> effluent count as "wasted" and reduce the required WAS pump rate. The tile takes the aeration volume, the mixed-liquor
> solids, the target SRT, the WAS concentration, and the effluent flow and solids, and returns the WAS flow in MGD and
> gpm -- the pump setpoint for the day.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The aeration volume is a
volume (`L^3`, in MG); the mixed-liquor, WAS, and effluent solids are mass concentrations (`M L^-3`, in mg/L); the
target SRT is a time (`T`, in days); the effluent flow and the WAS flow are volumetric flows (`L^3 T^-1`, in MGD, WAS
also reported in gpm); the solids masses are `M` (lb); the `8.34` constant is `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive volume, mixed-liquor solids, target SRT, or WAS concentration, or a computed negative
WAS flow (the effluent alone already exceeds the target wasting) returns `{ error }` or a flagged zero-WAS result.
Citation discipline (v19/v22): `GOVERNANCE.general` over the SRT-control relations by name (MCRT/SRT control; WEF
operator training); `editionNote` names the **WAS rate for a target SRT**, prints `system_solids = V x MLSS x 8.34`,
`solids_to_waste = system_solids / SRT`, `effluent_solids = Qeff x TSSeff x 8.34`, and
`Q_WAS = (solids_to_waste - effluent_solids) / (WAS_conc x 8.34)`, and states that **this is the inverse of a sludge-age
readout -- it answers how much to waste today -- SRT responds over roughly one SRT so over-correcting on a single
reading chases the process, effluent solids carried over the weir count as wasted and reduce the WAS pump rate, and the
process trend and the operator govern** -- an operating aid, not a process design.

## 2. The tile

### 2.1 `was-srt-control` -- The Wasting Decision (How Much to Waste Today, Not the Sludge Age)

```
inputs:
  aeration_volume_mg   MG     aeration basin volume
  mlss_mg_l            mg/L   mixed-liquor suspended solids
  target_srt_days      days   target sludge age (SRT / MCRT)
  was_conc_mg_l        mg/L   WAS (return sludge) concentration
  effluent_flow_mgd    MGD    effluent flow
  effluent_tss_mg_l    mg/L   effluent TSS

system_solids   = aeration_volume_mg x mlss_mg_l x 8.34               [lb]
solids_to_waste = system_solids / target_srt_days                    [lb/day]
effluent_solids = effluent_flow_mgd x effluent_tss_mg_l x 8.34       [lb/day]
Q_WAS_mgd       = (solids_to_waste - effluent_solids) / (was_conc_mg_l x 8.34)   [MGD]
Q_WAS_gpm       = Q_WAS_mgd x 1e6 / 1440                              [gpm]
```

**Pinned worked example (a 2 MG basin at 3,000 mg/L MLSS, target SRT 10 days, WAS 8,000 mg/L, effluent 5 MGD at 15
mg/L).** The system holds `2 x 3,000 x 8.34 = 50,040 lb` of solids, so `50,040 / 10 = 5,004 lb/day` must leave. The
effluent already carries `5 x 15 x 8.34 = 626 lb/day` over the weir, so the WAS pump removes the rest:
`Q_WAS = (5,004 - 626) / (8,000 x 8.34) = 4,378 / 66,720 = ` **0.066 MGD = 46 gpm**. **Cross-check (a longer SRT wastes
less).** Raise the target SRT to `15 days`: `solids_to_waste = 50,040 / 15 = 3,336 lb/day`, so
`Q_WAS = (3,336 - 626) / 66,720 = ` **0.041 MGD = 28 gpm** -- less wasting to grow an older, more stable sludge, and the
change should be made gradually since SRT lags. The tile returns the WAS flow in MGD and gpm.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["wastewater"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 10-day example + the 15-day
cross-check); `test/fixtures/compute-map.js` (`was-srt-control` -> `computeWasSrtControl` in `../../calc-water.js`);
`scripts/related-tiles.mjs` (-> `srt-fm-ratio` / `ras-flow-rate` / `svi-sludge-index`); `data/search/aliases.json`
("was rate", "waste activated sludge", "srt control", "sludge age control", "wasting rate", "mcrt control", "how much
to waste", "was pump setpoint"); the id appended to the water renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the system-solids and
solids-to-waste relations, the effluent-solids credit, the MGD-to-gpm conversion, and the error seams (non-finite, non-
positive volume / MLSS / SRT / WAS, negative computed WAS). Hand-writes its renderer (mirroring the calc-water.js
`srt-fm-ratio` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the system-solids / waste / Q_WAS stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the 10-day example -> 46 gpm).

## 5. Roadmap position

Provides the daily wasting decision that inverts `srt-fm-ratio` (which reports SRT from current wasting), and pairs with
`ras-flow-rate` (the return side). An SRT-trend projector (how the sludge age moves toward the target over days) and an
online-vs-target SRT deviation are deliberate future follow-ons. Further Group M growth stays evidence-driven.
