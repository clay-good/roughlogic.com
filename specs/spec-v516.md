# roughlogic.com Specification v516 -- Aircraft Weight and Balance (CG Envelope) (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v515.md.
>
> **The gap, and the evidence for it.** `center-of-gravity-2point` is a rigging two-scale CG, not the station-moment
> envelope check a light-aircraft loading requires, and Group K's aviation corner (opened by `density-altitude` and
> `crosswind-component`) has no weight-and-balance tile. The failure it exists to catch is the one that looks fine on the
> scale: a load can be **within gross weight and still out of CG**. Pile the baggage aft and the airplane weighs less
> than its maximum but its center of gravity slides behind the aft limit, which makes it dangerously unstable in pitch.
> The tile sums the station moments (empty weight, occupants, fuel, baggage), computes the CG, and checks it against both
> the weight limit and the forward and aft CG limits. It also flags the second trap: fuel burn moves the CG in flight,
> so a load that is in the envelope at takeoff can drift out by landing, and both ends must be checked. The tile takes
> the empty weight and arm and a set of station loads, and returns the total weight, the CG, and the pass/fail against
> the envelope.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The station weights and
the total weight are forces (weights, `M L T^-2`, in lb); the arms and the CG are lengths (`L`, in inches from the
datum); the moment is `M L^2 T^-2` (in in-lb). The v18/v21 contract: any non-finite input, a non-positive empty weight,
a negative station weight, a non-positive maximum gross weight, or a forward CG limit not below the aft limit returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the weight-and-balance relations by name (FAA
Weight & Balance Handbook FAA-H-8083-1; AC 91-23); `editionNote` names the **station-moment weight-and-balance check**,
prints `total_weight = sum(w)`, `total_moment = sum(w x arm)`, `CG = total_moment / total_weight`, and the pass test
`weight <= max_gross and fwd_limit <= CG <= aft_limit`, and states that **a load within gross weight can still be out of
CG (aft baggage slides the CG behind the aft limit and makes the airplane unstable), fuel burn moves the CG in flight so
both the takeoff and the zero-fuel/landing CG must fall in the envelope, the arms are measured from the aircraft datum,
and the specific aircraft flight manual and the pilot in command govern** -- a loading aid, not an airworthiness
determination.

## 2. The tile

### 2.1 `aircraft-weight-balance` -- The In-Gross-Weight-but-Out-of-CG Load W&B Exists to Catch

```
inputs:
  empty_weight_lb    lb    aircraft empty weight
  empty_arm_in       in    empty-weight arm (from datum)
  front_weight_lb    lb    front seats (pilot + passenger)     front_arm_in    in
  rear_weight_lb     lb    rear seats / passengers             rear_arm_in     in
  fuel_weight_lb     lb    usable fuel loaded                  fuel_arm_in     in
  baggage_weight_lb  lb    baggage                              baggage_arm_in  in
  max_gross_lb       lb    maximum gross weight
  fwd_cg_limit_in    in    forward CG limit
  aft_cg_limit_in    in    aft CG limit

total_weight = sum of the station weights                                  [lb]
total_moment = sum of (weight x arm) over the stations                     [in-lb]
CG           = total_moment / total_weight                                 [in]
in_envelope  = total_weight <= max_gross and fwd_cg_limit <= CG <= aft_cg_limit
```

**Pinned worked example (empty 1,500 lb at 39 in; front 340 at 37; fuel 180 at 48; baggage 200 at 95; envelope 35-47
in, MGW 2,300).** The total weight is `1500 + 340 + 180 + 200 = 2,220 lb` and the moment is
`58,500 + 12,580 + 8,640 + 19,000 = 98,720 in-lb`, so `CG = 98,720 / 2,220 = ` **44.47 in** -- inside the 35-47 in
envelope and under the 2,300 lb gross, a legal load. **Cross-check (under gross but out of CG).** Fly light: front 200
at 37, fuel 100 at 48, but pack 300 lb of baggage at 95: total is `1500 + 200 + 100 + 300 = 2,100 lb` (well under
gross), yet the moment is `99,200 in-lb` and `CG = 99,200 / 2,100 = ` **47.24 in** -- **behind** the 47 in aft limit.
The scale says fine, the CG says no: the exact aft-loading trap W&B exists to catch. The tile returns the total weight,
the CG, and the envelope pass/fail.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the legal example + the out-of-CG
cross-check); `test/fixtures/compute-map.js` (`aircraft-weight-balance` -> `computeAircraftWeightBalance` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `density-altitude` / `crosswind-component` /
`center-of-gravity-2point`); `data/search/aliases.json` ("weight and balance", "aircraft cg", "cg envelope", "station
moment", "loading chart", "aft cg limit", "moment arm aircraft", "w&b calculator"); the id appended to the mechanic
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the moment sum, the CG division, the under-gross-but-out-of-CG detection, and the error
seams (non-finite, non-positive empty weight / MGW, negative station weight, fwd limit not below aft). Hand-writes its
renderer (mirroring the calc-mechanic.js `center-of-gravity-2point` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the weight / moment / CG / envelope stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the legal example -> 44.47 in, in envelope).

## 5. Roadmap position

Completes the Group K light-aviation trio with `density-altitude` and `crosswind-component`. A zero-fuel-CG (landing)
check that re-runs the envelope after fuel burn, a lateral-balance variant, and a load-shift solver (how far to move
baggage to recenter the CG) are deliberate future follow-ons. Further Group K growth stays evidence-driven.
