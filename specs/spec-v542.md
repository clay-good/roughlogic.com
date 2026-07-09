# roughlogic.com Specification v542 -- Counterweight Fly System Balance (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production); no new module, group, or dependency. Inherits spec.md through spec-v541.md.
>
> **The gap, and the evidence for it.** A theatrical counterweight fly system balances the weight on a batten (the pipe
> plus scenery and electrics) against iron bricks in an arbor, and the bench has no tile for the balance. The catch that
> makes it a safety tile is the **purchase ratio**. A single-purchase system needs one pound of counterweight per pound
> on the batten; a **double-purchase** system, where the arbor travels half the distance the batten does, needs **two**
> pounds per pound. Get the ratio backward and the pipe runs away -- a loaded-out-of-balance batten is the classic
> fly-rail hazard, and the rule is to load the arbor only when the batten is at the loading rail. The tile takes the
> batten pipe weight, the attached load, the purchase type, the brick weight, and the counterweight already on the
> arbor, and returns the required counterweight, the out-of-weight amount, and the bricks to add or remove -- the number
> a flyman balances to before the batten leaves the rail.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The batten weight, load,
required and existing counterweight, out-of-weight amount, and brick weight are weights (`M L T^-2`, in lb); the purchase
ratio and the brick count are `dimensionless`. The v18/v21 contract: any non-finite input, a negative batten weight or
load, a non-positive brick weight, a negative existing counterweight, or an unrecognized purchase type returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the counterweight-balance relations by name
(theatrical counterweight rigging, single/double purchase); `editionNote` names the **counterweight fly-system
balance**, prints `required = (batten_weight + attached_load) x purchase_ratio` (ratio 1 single, 2 double),
`out_of_weight = required - existing`, and `bricks = ceil(|out_of_weight| / brick_weight)`, and states that **a
double-purchase system needs two pounds of counterweight per pound on the batten (and the arbor travels half as far) so
reversing the ratio lets the pipe run away, the arbor is loaded only when the batten is at the loading rail (an
out-of-weight batten is the classic fly-rail hazard), the arbor capacity is finite, and the venue rigging inspection and
the AHJ govern** -- a balancing aid, not a rigging inspection.

## 2. The tile

### 2.1 `counterweight-arbor-load` -- Why a Double-Purchase Arbor Needs Twice the Bricks

```
inputs:
  batten_weight_lb   lb    the batten pipe weight
  attached_load_lb   lb    scenery / electrics hung on the batten
  purchase_type      -     single (1:1) or double (2:1)
  brick_weight_lb    lb    counterweight brick unit weight
  existing_cw_lb     lb    counterweight already on the arbor

purchase_ratio = single ? 1 : 2
required_cw    = (batten_weight_lb + attached_load_lb) x purchase_ratio     [lb]
out_of_weight  = required_cw - existing_cw_lb                               [lb]  (+ add, - remove)
bricks         = ceil(|out_of_weight| / brick_weight_lb)                    [count]
```

**Pinned worked example (a 100 lb batten with 400 lb of load, single purchase, 30 lb bricks, 200 lb already on).** The
live weight is `100 + 400 = 500 lb`, and at a 1:1 single purchase the arbor needs `500 x 1 = ` **500 lb** of
counterweight. With 200 lb already loaded it is `500 - 200 = ` **300 lb light**, so add `ceil(300 / 30) = ` **10
bricks** to balance before the batten leaves the rail. **Cross-check (double purchase doubles the counterweight).** The
identical batten and load on a double-purchase line needs `500 x 2 = ` **1,000 lb** of counterweight -- twice the
bricks -- because the arbor moves half the distance the batten does; a flyman who loaded it as if single-purchase would
be 500 lb out of balance and the pipe would run. The tile returns the required counterweight, the out-of-weight amount,
and the brick count.

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["stage", "rigging"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the single-purchase example +
the double-purchase cross-check); `test/fixtures/compute-map.js` (`counterweight-arbor-load` ->
`computeCounterweightArborLoad` in `../../calc-stage.js`); `scripts/related-tiles.mjs` (-> `truss-capacity` /
`rigging-check` / `bridle-leg-tension`); `data/search/aliases.json` ("counterweight", "fly system balance", "arbor
load", "single double purchase", "counterweight bricks", "batten balance", "fly rail", "theatrical rigging balance");
the id appended to the stage renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-
index; a `bounds-fuzzer.test.js` block pinning both examples, the purchase-ratio doubling, the out-of-weight sign, the
brick round-up, and the error seams (non-finite, negative batten / load / existing, non-positive brick, bad type). Hand-
writes its renderer (mirroring the calc-stage.js `truss-capacity` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the required / out-of-weight / bricks stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the single-purchase example -> 500 lb required, 10 bricks).

## 5. Roadmap position

Opens theatrical fly/counterweight rigging in Group N (no such tile existed) beside `truss-capacity` and
`rigging-check`. An arbor-capacity check (does the required counterweight exceed the arbor's rated fill) and a
spot-line/bridle load helper are deliberate future follow-ons. Further Group N growth stays evidence-driven.
