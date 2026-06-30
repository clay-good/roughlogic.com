# roughlogic.com Specification v225 -- ASCE 7 ASD Load Combinations: Governing Demand and Net Uplift (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v224..v226 (the ASCE 7 structural design-loads trio -- rain/ponding, load
> combinations, and seismic base shear). This spec is the middle of the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: combining the loads to find the governing case is
> the first step of every member and connection check a builder or their engineer does for a permit. Adds one tile to
> **`calc-construction.js`** (Group E); no new module, group, or dependency. Inherits spec.md through spec-v224.md.
>
> **The gap, and the evidence for it.** The catalog now computes the individual loads on a roof or member -- dead from
> the takeoffs, snow (`snow-load`), wind (`wind-pressure`), and rain (`rain-load-ponding`, v224) -- but a member is never
> designed for one load at a time. ASCE 7 §2.4 specifies the allowable-stress-design combinations that say which loads
> act together and at what fraction, and the design demand is the *governing* combination, not any single load. Two of
> those combinations matter most to the trades: the largest gravity case (which sizes the beam, the joist, the footing)
> and the `0.6D + 0.6W` uplift case (which, when wind exceeds the dead weight holding the roof down, sets the hold-down
> and the fastening). The catalog can produce every load but never combines them, so a builder has no way to see which
> case governs or whether the roof has a net uplift to resist.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. All four load inputs and
every combination output are a uniform pressure (`M L^-1 T^-2`, psf -- the tile works equally in lb if every input is a
force, since the combinations are linear and unitless in their coefficients); the load-combination coefficients are
`dimensionless`. The wind load is signed: positive is downward (pressure), negative is upward (uplift). The v18/v21
contract: any non-finite input returns `{ error }` (negative dead/live/snow are allowed only for the signed-wind term;
a negative dead, live, or snow load is rejected as non-physical). Citation discipline (v19/v22): `GOVERNANCE.general`
over the load-combination set by name; `editionNote` names the **ASCE 7 §2.4.1 basic ASD load combinations**
(`D`; `D+L`; `D+(Lr or S or R)`; `D+0.75L+0.75(Lr or S or R)`; `D+0.6W`; `D+0.75L+0.75(0.6W)+0.75(Lr or S or R)`;
`0.6D+0.6W`), and states that **this is the basic ASD set (the seismic E combinations and the LRFD strength set are a
separate selection), the roof load entered as S stands in for the governing of roof-live / snow / rain, the dead load in
the `0.6D` combinations is the reliably-present dead only, and this is a load-combination aid, not a member design** --
the governing demand, not the engineer's stamped capacity check.

## 2. The tile

### 2.1 `asce7-load-combinations` -- Governing ASD Demand and Net Uplift

```
inputs:
  dead_psf   M L^-1 T^-2    dead load D (>= 0), psf
  live_psf   M L^-1 T^-2    floor live load L (>= 0), psf (default 0 for a roof)
  snow_psf   M L^-1 T^-2    roof load: governing of roof-live / snow / rain, Lr or S or R (>= 0), psf
  wind_psf   M L^-1 T^-2    wind load W, signed: + downward, - uplift, psf

combos = [
  dead_psf,                                                        # 1  D
  dead_psf + live_psf,                                             # 2  D + L
  dead_psf + snow_psf,                                             # 3  D + (Lr or S or R)
  dead_psf + 0.75*live_psf + 0.75*snow_psf,                        # 4  D + 0.75L + 0.75(Lr or S or R)
  dead_psf + 0.6*wind_psf,                                         # 5  D + 0.6W
  dead_psf + 0.75*live_psf + 0.75*0.6*wind_psf + 0.75*snow_psf,    # 6  D + 0.75L + 0.75(0.6W) + 0.75(Lr or S or R)
  0.6*dead_psf + 0.6*wind_psf ]                                    # 7  0.6D + 0.6W

governing_gravity_psf = max(combos)                # largest downward demand (sizes the member)
controlling_case_psf  = min(combos)                # most negative; if < 0 it is a net uplift
net_uplift_psf        = controlling_case_psf < 0 ? -controlling_case_psf : 0
```

**Pinned worked example (roof: D = 15, S = 30, W = -25 uplift).** A roof with 15 psf dead, no floor live, 30 psf snow,
and a 25 psf wind uplift: the seven ASD combinations are `[15, 15, 45, 37.5, 0, 26.25, -6]` -- combination 3 (`D + S`)
gives the largest gravity demand at **45 psf**, and combination 7 (`0.6D + 0.6W = 9 - 15`) gives **-6 psf**, a **6 psf
net uplift** the roof-to-wall connection must resist even though the 15 psf dead exceeds neither snow nor the raw wind.
**Cross-check (floor: D = 20, L = 40, W = 30 downward).** A floor with 20 psf dead, 40 psf live, no snow, and a 30 psf
downward wind: the combinations are `[20, 60, 20, 50, 38, 63.5, 30]` -- combination 6 governs at **63.5 psf**, and the
minimum is `+20` (combination 1 or 3), so there is **no net uplift**. The same machine returns the gravity demand that
sizes the joist on a floor and the uplift that sizes the hold-down on a roof, which is exactly why the design starts from
the combination set, not the largest single load.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the ASD load-combination set, `editionNote` naming ASCE 7 §2.4.1 with the
basic-set-only / S-stands-for-roof-governing / reliable-dead / not-a-member-design caveats);
`test/fixtures/worked-examples.json` (the roof-uplift example + the floor cross-check); `test/fixtures/compute-map.js`
(`asce7-load-combinations` -> `computeAsce7LoadCombinations` in `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `snow-load` / `wind-pressure` / `rain-load-ponding`); `data/search/aliases.json` ("load combinations", "asce 7
combinations", "asd combinations", "governing load", "net uplift", "0.6d + 0.6w", "design load case", "factored load");
the id appended to the existing construction renderers declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, negative dead /
live / snow, the no-uplift path). Raise the `calc-construction.js` size cap if needed (dated comment). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the net-uplift and no-uplift paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the seven-combination list plus the governing /
net-uplift summary wraps on a phone); render-no-nan + a11y sweep, output read to the value (D15/S30/W-25 -> 45 psf
governing, 6 psf net uplift).

## 5. Roadmap position

The middle of the ASCE 7 structural design-loads batch (v224..v226). Consumes the dead, snow, wind, and rain the
takeoff and load tiles produce, and its governing demand is the number a member-capacity check (`beam-loading`,
`joist-deflection`, `column-buckling-wood`, footing tiles) is sized against. The seismic E combinations and the LRFD
strength set are deliberate future follow-ons; the seismic base shear they would consume lands as `seismic-base-shear`
(v226).
