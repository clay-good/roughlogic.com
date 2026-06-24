# roughlogic.com Specification v158 -- Steam Pipe Sizing by Velocity (calc-pipefit.js, Group B, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 626, package 0.76.0; v157-v162 of the batch). Batch spec-v157..v163 (plumbing/pipefitting -- steamfitting, pressure
> piping, and pipe support).** In-scope catalog expansion under the spec-v106 trades-only charter: the
> second of the steam-and-condensate cluster. Adds one tile to **`calc-pipefit.js`** (Group B); no new
> module, group, or dependency. Inherits spec.md through spec-v157.md.
>
> **The gap, and the evidence for it.** `gas-pipe-sizing` sizes fuel gas by capacity tables and
> `boiler-pipe-sizing` sizes hot water by GPM and a velocity ceiling, but neither sizes a **steam** main.
> Steam is sized by mass flow against an allowable velocity, and the catch is that the volume a pound of
> steam occupies collapses as pressure rises -- so the same 1,000 lb/hr needs very different pipe at 5
> psig than at 100 psig. The steamfitter pulling a main reaches for the steam specific volume and a
> velocity ceiling (roughly 6,000 to 12,000 ft/min for supply mains) and gets the size from those, and
> the catalog gives the water and gas versions of that calc but not the steam one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The mass
flow is a mass per time (`M/T`, lb/hr); the steam specific volume is a volume per mass (`L^3/M`, ft^3/lb);
the velocity ceiling is `L/T` (ft/min); the required internal area is `L^2` (in^2) and the resulting
minimum diameter is `L` (in); the chosen velocity is `L/T`. The v18/v21 contract: any non-finite input or
a non-positive flow, specific volume, or velocity ceiling returns `{ error }`; the divisions are by the
guarded-positive velocity ceiling and time base. Citation discipline (v19/v22): `GOVERNANCE.general` over
the continuity relation and the recommended-velocity band by name; `editionNote` names ASHRAE
Fundamentals / Systems and the saturated-steam specific-volume points, and states that **the velocity
band is a recommendation, not a code limit** -- noise, erosion, and the condensate-loading reverse-flow
case at low velocity all bear on the final choice, which the engineer of record governs.

## 2. The tile

### 2.1 `steam-pipe-velocity` -- Steam Main Size from Flow and Velocity

```
inputs:
  steam_flow_lbhr   M/T     steam mass flow, lb/hr
  spec_vol_ft3lb    L^3/M   saturated-steam specific volume at the line pressure, ft^3/lb
  vel_ceiling_fpm   L/T     allowable velocity, ft/min (supply main 6,000-12,000 typical)

req_area_ft2 = (steam_flow_lbhr x spec_vol_ft3lb) / (vel_ceiling_fpm x 60)
req_dia_in   = sqrt(4 x req_area_ft2 / pi) x 12
# then the smallest nominal pipe whose ID >= req_dia_in, and the actual velocity in it:
actual_fpm   = (steam_flow_lbhr x spec_vol_ft3lb) / (chosen_area_ft2 x 60)
```

The specific volume comes from the bundled saturated-steam table keyed by the entered gauge pressure, or
is user-supplied.

**Pinned worked example.** 1,000 lb/hr of 15 psig steam (specific volume 13.7 ft^3/lb), velocity ceiling
6,000 ft/min: `req_area = 1000 x 13.7 / (6000 x 60) = 0.0381 ft^2 = 5.48 in^2`;
`req_dia = sqrt(4 x 5.48 / pi) = 2.64 in` -> the next nominal up is **3 in** (ID 3.068 in, area 0.0513
ft^2), giving an actual velocity `1000 x 13.7 / (0.0513 x 60) = 4,450 ft/min`, inside the band.
**Cross-check (double the flow, one size up).** 2,000 lb/hr at the same conditions doubles the required
area to 10.96 in^2 (req_dia 3.74 in) -> **4 in**. Flow scales the area linearly; the pressure (through
specific volume) is the other lever.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the continuity relation and velocity band, `editionNote`
naming ASHRAE and the recommendation-not-code caveat); `test/fixtures/worked-examples.json` (example +
cross-check); `test/fixtures/compute-map.js` (`steam-pipe-velocity` -> `computeSteamPipeVelocity` in
`../../calc-pipefit.js`); `scripts/related-tiles.mjs` (-> `flash-steam-pct` / `steam-trap-sizing` /
`boiler-pipe-sizing`); `data/search/aliases.json` ("steam pipe sizing", "steam main", "steam velocity",
"steam pipe diameter", "lb/hr steam", "steam supply main"); the id appended to the existing pipefit
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, the cross-check, and error seams (non-finite,
flow/specific-volume/ceiling <= 0). Raise the `calc-pipefit.js` size cap by ~20 percent if needed (dated
comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the area, diameter, and chosen-size lines
wrap on a phone); render-no-nan + a11y sweep, output read to the value (1,000 lb/hr / 13.7 / 6,000 ->
3 in at 4,450 ft/min).

## 5. Roadmap position

Center of the steam cluster, between flash (v157) and trap sizing (v159). Pairs naturally with the
existing `boiler-pipe-sizing` (water) and `gas-pipe-sizing` (gas) so a fitter sizes any of the three
distribution media from one group. Further steam growth stays evidence-driven.
