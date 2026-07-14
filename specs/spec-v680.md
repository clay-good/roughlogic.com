# roughlogic.com Specification v680 -- Feed for a Target Turned Finish (calc-shop.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`** (Group K,
> machinist / mechanic), no new module, group, or dependency. Inherits spec.md through spec-v679.md.
>
> **The gap, and the evidence for it.** Spec-v40 (`turning-surface-finish`) runs the scallop geometry forward: given a
> feed and nose radius, it returns the theoretical surface finish. The programming question a machinist asks is the
> inverse -- **how fast can I feed and still hold the finish the print calls out**. The forward tile makes you guess feeds
> and re-read the finish; the inverse solves it directly. From `Rt = f^2 / (8 x nose_radius)`,
> `f = sqrt(8 x nose_radius x Rt)`, and a finish spec'd as Ra converts with `Rt = 4 x Ra` (the tile's Ra ~= Rt/4
> estimate). The number this settles: holding **25 microinch Ra** with a 1/32 in nose radius allows **0.005 IPR**, and a
> finer **16 microinch Ra** drops it to **0.004 IPR**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`turning-surface-finish` sibling: the target finish (microinches) and the nose radius are `L`, the finish basis is a
`dimensionless` categorical select (Ra or Rt), and the returned feed is `L` (IPR). It reuses the sibling's `Rt = f^2/(8r)`
scallop relation and its `Ra ~= Rt/4` estimate. The v18/v21 contract: any non-finite input, a non-positive target or
nose radius, or an unknown finish basis returns `{ error }`. Citation discipline (v19/v22): the theoretical scallop
relation solved for feed, first-principles as in Machinery's Handbook, by name; the note states that **the finish
improves as the square of the feed so a larger nose radius lets you feed faster for the same finish, an Ra target is
converted by Rt = 4 x Ra, this is the theoretical scallop feed (built-up edge, tool wear, deflection, and vibration
roughen the measured finish, so leave margin), and the print, the insert, and a measured finish govern**.

## 2. The tile

### 2.1 `feed-for-surface-finish` -- Feed for a Target Turned Finish

```
inputs:
  target_finish_uin   uin   target surface finish in microinches (> 0)
  finish_basis        -     ra (arithmetic average) or rt (peak-to-valley)
  nose_radius_in      in    tool nose radius (> 0)

Rt = (finish_basis == "ra" ? 4 x target : target) x 1e-6    [in]
max_feed_ipr = sqrt(8 x nose_radius_in x Rt)                 [IPR]
```

**Pinned worked example (a 25 uin Ra target).** target = 25 uin Ra, r = 1/32 in: `Rt = 4 x 25 = 100 uin = 0.0001 in`,
`f = sqrt(8 x 0.03125 x 0.0001) = sqrt(0.000025) = ` **0.005 IPR**; feeding 0.005 IPR back through
`turning-surface-finish` returns 25 uin Ra, the input. **Cross-check (a finer finish).** target = 16 uin Ra, same
radius: `f = sqrt(8 x 0.03125 x 4 x 16e-6) = ` **0.004 IPR** -- a finer finish forces a slower feed (the finish scales
with the square of the feed).

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist", "mechanic"]`, beside `turning-surface-finish`, which sits in the
spec-v40 shop section OUTSIDE the exact-12 `// Group K: Mechanic`..`// Group L` audit block, so no count bump); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (scallop relation solved for feed, `GOVERNANCE.general` matching
the sibling, the note per §1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`feed-for-surface-finish` -> `computeFeedForSurfaceFinish` in `../../calc-shop.js`); `scripts/related-tiles.mjs` (->
`turning-surface-finish` / `material-removal-rate` / `cutting-speed-rpm` / `ballnose-scallop-height`, and the forward
tile links back); `data/search/aliases.json` ("feed for a target finish", "feed rate for surface finish", "ipr for a
target ra", plus adjacent rows); `SHOP_RENDERERS["feed-for-surface-finish"]` via a hand-written renderer with an Ra/Rt
`makeSelect` basis toggle (the select feeds the compute, satisfying check-dead-inputs) and the id added to the calc-shop
declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the Ra/Rt equivalence, the round-trip through
`computeTurningSurfaceFinish`, and the error seams. The calc-shop.js gzip cap is expected to hold (verify at build).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 0.005 IPR for 25 uin Ra).

## 5. Roadmap position

Pairs the forward finish tile (`turning-surface-finish`, finish from feed) with its inverse (feed from a target finish),
the two halves of the turned-finish programming question. Further Group K growth stays evidence-driven.
