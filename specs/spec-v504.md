# roughlogic.com Specification v504 -- Rolling-Bearing L10 Rating Life (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, the machining bench); no new module, group, or dependency. Inherits spec.md through spec-v503.md.
>
> **The gap, and the evidence for it.** A machinist or millwright picks a bearing from a catalog's dynamic load rating
> `C`, but the bench has no tile that turns `C`, the actual load, and the speed into a rating life. ISO 281 does it with
> `L10 = (C/P)^p x 10^6` revolutions, and the exponent is the whole story: for ball bearings `p = 3`, so life scales as
> the **cube** of the load ratio. A 25% overload does not cut life 25% -- it roughly halves it. That cube law is what
> people miss when they "upsize the load a little" or run a bearing above its rating, and it is why a small reduction in
> load (better alignment, a lighter belt tension) buys a large life gain. Two more cautions the tile makes explicit: the
> basic `L10` assumes clean, well-lubricated conditions (contamination needs the `aISO` modified life), and it is the
> life at which **10% have already failed**, not an average. The tile takes the load rating, the equivalent load, the
> speed, and the bearing type, and returns the rating life in revolutions and hours -- the number a maintenance interval
> is set from.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The dynamic load rating
and the equivalent dynamic load are forces (`M L T^-2`, in lbf); the load ratio and the exponent are `dimensionless`;
the rating life in revolutions is `dimensionless` (a pure count); the speed is `T^-1` (rpm); the life in hours is `T`.
The v18/v21 contract: any non-finite input, a non-positive load rating, equivalent load, or speed, or an unrecognized
bearing type returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the L10 relation by name (ISO
281 / ABMA 9 & 11); `editionNote` names the **ISO 281 basic rating life (L10)**, prints `L10 = (C / P)^p x 10^6` rev
and `L10h = L10 / (60 x rpm)` hours with `p = 3` for ball bearings and `p = 10/3` for roller bearings, and states that
**life scales as the cube (ball) of the load ratio so a modest overload cuts life sharply, the basic L10 assumes clean
and well-lubricated operation (contamination, misalignment, and lubricant condition are handled by the modified aISO
life), L10 is the life at which 10% of a population has failed not the average, and the mounting, lubrication, and
application govern** -- a planning estimate, not a warranty.

## 2. The tile

### 2.1 `bearing-l10-life` -- The Cube Law That Punishes a Bearing Overload

```
inputs:
  dynamic_rating_lbf   lbf   catalog basic dynamic load rating C
  equivalent_load_lbf  lbf   equivalent dynamic bearing load P
  speed_rpm            rpm   operating speed
  bearing_type         -     ball (p = 3) or roller (p = 10/3)

p       = bearing_type == "roller" ? 10/3 : 3
L10_rev = (dynamic_rating_lbf / equivalent_load_lbf)^p x 1e6      [rev]
L10_hr  = L10_rev / (60 x speed_rpm)                             [hr]
```

**Pinned worked example (a ball bearing, C = 5,000 lbf, P = 1,000 lbf, 1,750 rpm).**
`L10 = (5000/1000)^3 x 10^6 = 5^3 x 10^6 = ` **125,000,000 rev**, and at 1,750 rpm
`L10h = 125e6 / (60 x 1750) = ` **1,190 hr**. **Cross-check (a 25% overload nearly halves it).** Raise the load to
`P = 1,250 lbf` (25% more): `L10 = (5000/1250)^3 x 10^6 = 4^3 x 10^6 = 64,000,000 rev`, so `L10h = ` **610 hr** -- the
cube law turns a 25% load increase into a 49% life loss, the reason a small alignment or tension improvement pays off so
well. The tile returns the exponent, the rating life in revolutions, and the life in hours.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machinist", "mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the baseline example + the
25%-overload cross-check); `test/fixtures/compute-map.js` (`bearing-l10-life` -> `computeBearingL10Life` in
`../../calc-machining.js`); `scripts/related-tiles.mjs` (-> `press-fit-pressure` / `vbelt-drive` / `shrink-fit`);
`data/search/aliases.json` ("bearing life", "l10 life", "rating life", "iso 281", "dynamic load rating", "bearing cube
law", "c/p ratio", "bearing hours"); the id appended to the machining renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the ball vs
roller exponent, the cube-law halving under 25% overload, the monotonic fall of life with load, and the error seams
(non-finite, non-positive C / P / rpm, bad type). Hand-writes its renderer (mirroring the calc-machining.js pattern).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the L10 rev / hours stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the baseline example -> 1,190 hr).

## 5. Roadmap position

Adds the bearing-selection life check to the machining bench, alongside `press-fit-pressure` (mounting the race) and
`vbelt-drive` (the load path that sets `P`). An equivalent-load helper (radial and thrust combined via X and Y factors),
an `aISO` modified-life factor, and a life-adjustment-for-reliability (L5, L1) companion are deliberate future follow-
ons. Further Group K growth stays evidence-driven.
