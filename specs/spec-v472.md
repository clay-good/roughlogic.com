# roughlogic.com Specification v472 -- Transformer Loading Efficiency and Losses (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the electrical energy-efficiency trio (v471 premium motor upgrade ->
> v472 transformer loading efficiency -> v473 economic conductor sizing). `transformer-sizing` picks a kVA rating; this tile
> tells you how efficiently that transformer runs at a given load -- the no-load and load losses that never stop costing.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A transformer's losses are the constant no-load
> (core/iron) loss plus a load (copper) loss that varies with the square of the load: `losses = P_noload + load^2 * P_load`.
> The efficiency at a load is the output over the output plus losses. Because the no-load loss runs `24/7`, a lightly loaded
> transformer can be surprisingly inefficient. `transformer-sizing` sizes the unit but never reports its efficiency or
> losses. This adds the loading tile to the existing **`calc-electrical.js`** module (Group A); no new group, trade, or
> dependency. Inherits spec.md through spec-v471.md.
>
> **The gap, and the evidence for it.** A `75 kVA` transformer with `200 W` no-load loss and `1200 W` full-load loss, at
> `75%` load and unity power factor, delivers `75 * 0.75 = 56.25 kW` while losing `200 + 0.75^2 * 1200 = 875 W = 0.875 kW`,
> for an efficiency of `56.25 / (56.25 + 0.875) = 98.47%`. Peak efficiency occurs where the load loss equals the no-load loss
> (here near `41%` load); above and below it, efficiency falls. No tile does this; a designer sized the transformer but never
> saw what it wastes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The kVA rating and the output
are apparent/real powers (kVA, kW); the losses are powers (W and kW); the load and power factor are dimensionless
(fractions); the efficiency is dimensionless (percent). The v18/v21 contract: any non-finite input, or a non-positive kVA,
or a negative loss, or a load or power factor outside `(0, 1]`, returns `{ error }`; the tile reports the output, the no-load
and load losses, the total loss, and the efficiency, and notes the maximum-efficiency load point (where load loss equals
no-load loss). Citation discipline (v19/v22): `GOVERNANCE.general` over the transformer loading efficiency by name;
`editionNote` names **the transformer loss model `losses = P_noload + load^2 * P_load` (no-load/core plus load/copper), the
output `= kVA * load * pf`, the efficiency `= output / (output + losses)`, and the maximum-efficiency load
`= sqrt(P_noload / P_load)`**, and states that **this returns the transformer efficiency and losses at a load, that no-load
loss runs continuously and drives the all-day efficiency, and that it is an analysis aid, not a substitute for the
transformer test report**.

## 2. The tile

### 2.1 `transformer-loading-efficiency` -- Transformer Loading Efficiency and Losses

```
inputs:
  kva_rating   kVA   transformer rating
  noload_w     W     no-load (core) loss
  loadloss_w   W     full-load (copper) loss
  load         -     load fraction (0-1)
  pf           -     power factor (default 1.0)

output_kw    = kva_rating * load * pf
losses_kw    = (noload_w + load^2 * loadloss_w) / 1000
efficiency   = output_kw / (output_kw + losses_kw) * 100
max_eff_load = sqrt(noload_w / loadloss_w)
```

**Pinned worked example (75 kVA, 200 W no-load, 1200 W load loss, 75% load, PF 1.0).** output `56.25 kW`;
losses `200 + 0.5625*1200 = 875 W = 0.875 kW`; efficiency `56.25/57.125 = 98.47%`; peak efficiency near
`sqrt(200/1200) = 41%` load. **Cross-check (lightly loaded runs worse for its size).** At `25%` load the output is
`18.75 kW` and losses `275 W`, efficiency `98.55%` but the no-load loss is now a bigger fraction of the throughput -- the
all-day efficiency of an oversized transformer suffers. A non-positive kVA or out-of-range load takes the error path; the
non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `transformer-sizing`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, transformer loading efficiency, `editionNote` naming the loss model, the
efficiency relation, and the maximum-efficiency load); `test/fixtures/worked-examples.json` (the 75% example + the 25%
cross-check); `test/fixtures/compute-map.js` (`transformer-loading-efficiency` -> `computeTransformerLoadingEfficiency` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `transformer-sizing` / `motor-efficiency-upgrade-savings` /
`buck-boost-transformer-sizing` / `power-factor-billing-savings`); `data/search/aliases.json` ("transformer efficiency",
"transformer loss", "no load loss", "transformer loading", "core copper loss", "transformer losses", "transformer
efficiency load", "all day efficiency", "transformer waste"); the id appended to the existing electrical renderers block in
`app.js`; the `// dims:` annotation (kVA/kW power, losses power, load/pf/efficiency dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the max-efficiency load, and the non-positive /
out-of-range / non-finite error seams. No new module; re-pin `calc-electrical.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the max-efficiency load, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the output / losses / efficiency set wraps on a
phone); render-no-nan + a11y sweep, output read to the value (75 kVA, 75% load -> 98.47%).

## 5. Roadmap position

The middle of the electrical energy-efficiency trio: `motor-efficiency-upgrade-savings` (v471) and
`economic-conductor-sizing` (v473) bracket it. An all-day (energy) efficiency over a load profile is the deliberate next
follow-on.
