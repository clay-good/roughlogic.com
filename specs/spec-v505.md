# roughlogic.com Specification v505 -- Anchor Rode Scope and Swing Radius (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, "Mechanic -- Auto, Marine, Aviation"); no new module, group, or dependency. Trade `["mechanic"]`. Inherits
> spec.md through spec-v504.md.
>
> **The gap, and the evidence for it.** Marine ground tackle is unrepresented in the bench, and the number that keeps a
> boat where it was anchored is scope: the ratio of rode paid out to the vertical distance from the bow to the seabed.
> The catch that drags an anchor at 2 a.m. is the vertical distance itself. Scope is figured from the water depth **plus
> the bow-roller height above the water**, and at **high tide**, not the depth the sounder reads at the moment of
> anchoring. Skip the bow height and the rising tide and the real scope is far short of the target, the anchor breaks
> out, and the boat goes for a walk. The tile takes the depth, the bow-roller height, the desired scope ratio, and the
> boat length, and returns the rode to deploy, the actual scope that rode produces, and the swing radius the boat
> sweeps -- the last of which governs how close it can be anchored to the next boat in a crowded anchorage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The depth, bow height,
rode, swing radius, and boat length are lengths (`L`, in feet); the scope ratio is `dimensionless`. The v18/v21
contract: any non-finite input, a non-positive depth, a negative bow height or boat length, or a scope ratio below 1
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the scope and swing relations by name
(seamanship convention -- Chapman Piloting, US Sailing, ABYC ground-tackle references); `editionNote` names the **anchor
rode scope and swing-radius relations**, prints `vertical = depth + bow_height` (at high tide), `rode = scope x
vertical`, `actual_scope = rode / vertical`, and `swing_radius = sqrt(rode^2 - vertical^2) + boat_length`, and states
that **scope is measured from the seabed to the bow roller (depth plus bow height) at high tide not the instantaneous
sounder depth, an all-chain rode holds at a lower ratio (about 5:1 or even 3:1) while rope-and-chain wants 7:1, the
swing radius assumes the boat pivots on a set anchor and governs the spacing to neighbors and hazards, and local
conditions, bottom type, and skipper judgment govern** -- a planning aid, not a guarantee the anchor holds.

## 2. The tile

### 2.1 `anchor-rode-scope` -- The Bow-Height-and-High-Tide Scope That Keeps an Anchor Set

```
inputs:
  water_depth_ft    ft    charted / sounded depth at high tide
  bow_height_ft     ft    height of the bow roller above the water
  scope_ratio       -     desired scope (7 rope+chain / 5 mixed / 3 all-chain)
  boat_loa_ft       ft    boat length overall (for the swing radius)

vertical      = water_depth_ft + bow_height_ft                          [ft]   the true rise to the roller
rode_ft       = scope_ratio x vertical                                  [ft]   rode to deploy
actual_scope  = rode_ft / vertical                                      [-]
swing_radius  = sqrt(rode_ft^2 - vertical^2) + boat_loa_ft              [ft]
```

**Pinned worked example (15 ft of water, a 3 ft bow roller, 7:1 scope, 30 ft boat).** The vertical rise is
`15 + 3 = 18 ft` -- not 15 -- so the rode to deploy is `7 x 18 = ` **126 ft**, and the boat sweeps a swing radius of
`sqrt(126^2 - 18^2) + 30 = sqrt(15876 - 324) + 30 = 124.7 + 30 = ` **154.7 ft**. Anchoring on 15 ft alone would have
paid out only `105 ft`, an actual scope of `105/18 = 5.8:1` -- short of the 7:1 target, the quiet error that drags.
**Cross-check (all-chain holds at less scope).** Same water and boat with an all-chain rode at 3:1:
`rode = 3 x 18 = 54 ft`, `swing = sqrt(54^2 - 18^2) + 30 = 50.9 + 30 = ` **80.9 ft** -- a much tighter circle, the
reason all-chain is favored in a crowded anchorage even though the ratio is lower. The tile returns the true vertical,
the rode to deploy, the actual scope, and the swing radius.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 7:1 example + the all-chain 3:1
cross-check); `test/fixtures/compute-map.js` (`anchor-rode-scope` -> `computeAnchorRodeScope` in
`../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `hull-speed` / `prop-slip` / `wire-rope-strength`);
`data/search/aliases.json` ("anchor scope", "rode length", "swing radius", "anchoring scope ratio", "7 to 1 scope",
"all chain scope", "ground tackle", "anchor rode"); the id appended to the mechanic renderers declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the
depth-plus-bow vertical, the swing-radius geometry, the lower-scope all-chain case, and the error seams (non-finite,
non-positive depth, negative bow / LOA, scope < 1). Hand-writes its renderer (mirroring the calc-mechanic.js pattern).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the vertical / rode / swing stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 7:1 example -> 126 ft rode, 154.7 ft swing).

## 5. Roadmap position

Opens marine ground tackle in Group K beside the hull and propeller tiles. An anchor-holding-power-by-bottom-type
lookup, a chain-catenary shock-load estimate, and a rode-sizing (chain and rope size by boat displacement) companion are
deliberate future follow-ons. Further Group K growth stays evidence-driven.
