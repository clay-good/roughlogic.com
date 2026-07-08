# roughlogic.com Specification v478 -- Hydronic Snowmelt Surface Load and Boiler Sizing (ASHRAE / Chapman) (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-08; PROPOSED same day). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter, and the radiant follow-on spec-v199 §6 named
> ("further radiant growth (panel surface-temperature design, downward-loss, snowmelt sizing) stays evidence-driven").
> Adds one tile to **`calc-hvac.js`** (Group C); no new module, group, or dependency. Inherits spec.md through
> spec-v477.md.
>
> **The gap, and the evidence for it.** The catalog runs residential hydronics from the boiler to the loop
> (`boiler-pipe-sizing`, `radiant-loop-sizing`, `radiant-floor-output`, `hydronic-gpm-deltat`, the expansion tank) but
> has nothing for the fastest-growing hydronic slab there is: the heated driveway, ramp, or entrance walk. Sizing one is
> a single published energy balance -- the Chapman (1956) / ASHRAE Handbook (HVAC Applications, Snow Melting and Freeze
> Protection) steady-state surface flux `q_o = q_s + q_m + A_r (q_h + q_e)`: warm the falling snow to the 33 F melting
> film, melt it, and (over the snow-free fraction A_r) pay the convective and evaporative losses of the exposed wet
> surface. The class choice is the design decision: a residential drive (Class I, A_r = 0) is allowed to run snow-covered
> while it melts, a commercial walk (Class II, A_r = 0.5) keeps up with the storm, and a hospital ramp or helipad
> (Class III, A_r = 1) must stay black -- the same storm moves the example slab from 78 to 111 to 144 Btu/hr-ft^2 on the
> A_r term alone. The boiler then carries that flux over the slab area plus the ~20% back-and-edge loss. The published
> component forms are the Chapman/ASHRAE IP closed forms as reproduced verbatim in Lund, "Pavement Snow Melting"
> (Geo-Heat Center / OSTI), the primary free-access source.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The heat fluxes are
heat-rate-per-area terms and the boiler load a heat rate (both annotate via their SI mechanical dims: flux `M T^-3`,
load `M L^2 T^-3`); the temperatures are `T`; the snowfall rate (in/hr of water equivalent) is `L T^-1`; the wind speed
`L T^-1`; the humidity, snow-free area ratio, and back-loss percent `dimensionless`; the area `L^2`; the vapor pressure
(in Hg) annotates as a pressure `M L^-1 T^-2`. The v18/v21 contract: any non-finite input, a non-positive snowfall rate
or area, a humidity outside 0 to 100, a negative wind, a snow-free area ratio outside 0 to 1, an air temperature above
the 33 F film (the correlation is for snowfall conditions), or a back-loss outside 0 to 99 returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the energy balance by name; `editionNote` names the **ASHRAE
Handbook -- HVAC Applications, Snow Melting and Freeze Protection chapter (Eq. 1)** and the **Chapman (1956) IP
component forms as printed in Lund, "Pavement Snow Melting" (Geo-Heat Center)**: `q_s = 2.6 s (t_f - t_a)`,
`q_m = 746 s`, `q_h = 11.4 (0.0201 V + 0.055)(t_f - t_a)`, `q_e = h_fg (0.0201 V + 0.055)(0.188 - p_av)` with the film
t_f = 33 F, h_fg = 1075.5 Btu/lb at the film (a steam-table value; Lund leaves it symbolic), 0.188 in Hg the saturation
pressure at the film, and the ambient vapor pressure from the August-Roche-Magnus saturation curve (the same
coefficients `surface-condensation-risk` already carries) times the relative humidity -- and states that **the classes
are Chapman's (I residential A_r = 0, II commercial 0.5, III critical 1.0), the ~20% back loss is the ASHRAE typical
for an insulated slab (bridges and exposed backs run higher), the result is a steady-state design flux for the chosen
storm (not an annual energy), and the idling/pickup strategy, controls, and glycol fluid design follow the
manufacturer's manual** -- a sizing aid, not a stamped hydronic design.

## 2. The tile

### 2.1 `snowmelt-load` -- The Chapman/ASHRAE Steady-State Snowmelt Flux and the Boiler It Implies

```
inputs:
  s_inhr          in/hr    design snowfall rate, water equivalent (~1/10 the snow depth rate)
  t_air_f         F        design air temperature (at or below the 33 F film)
  wind_mph        mph      design wind speed
  rh_pct          %        design relative humidity
  ar              -        snow-free area ratio A_r: 0 Class I (residential), 0.5 Class II (commercial), 1 Class III (critical)
  area_ft2        ft^2     heated slab area
  back_loss_pct   %        back and edge losses (default 20)

t_f  = 33 F (melting film)
p_av = (rh/100) x 0.02953 x 6.1094 exp(17.625 tc / (tc + 243.04)),  tc = (t_a - 32)/1.8   [in Hg, Magnus]
q_s  = 2.6 x s x (t_f - t_a)                       q_m = 746 x s
q_h  = 11.4 x (0.0201 V + 0.055) x (t_f - t_a)     q_e = 1075.5 x (0.0201 V + 0.055) x (0.188 - p_av)
q_o  = q_s + q_m + A_r x (q_h + q_e)               [Btu/hr-ft^2]
boiler = q_o x area x (1 + back_loss/100)          t_m ~ 0.5 x q_o + t_f   (Chapman mean-fluid rule of thumb)
```

**Pinned worked example (commercial walk in a design storm).** 0.1 in/hr water-equivalent (about an inch of snow an
hour), 20 F, 10 mph, 80% RH, Class II (A_r = 0.5), 500 ft^2, 20% back loss: `p_av = 0.0878 in Hg`; `q_s = 3.38`;
`q_m = 74.6`; `q_h = 37.94`; `q_e = 27.59`; `q_o = 3.38 + 74.6 + 0.5 x 65.53 = ` **110.7 Btu/hr-ft^2** -- squarely in
the published Class II band (97 to 298 across the ASHRAE city table). Boiler: `110.7 x 500 x 1.2 = ` **66,400 Btu/hr**
(66.4 MBH), with a mean fluid temperature around `0.5 x 110.7 + 33 = ` **88 F**. **Cross-check (the same storm on a
Class III surface).** A_r = 1.0 and nothing else changed: `q_o = ` **143.5 Btu/hr-ft^2**, boiler **86.1 MBH** -- the
must-stay-black requirement alone adds 30% to the plant, which is why the class, not the climate, is the first
question a snowmelt quote answers.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","plumbing"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the Class II example + the
Class III cross-check); `test/fixtures/compute-map.js` (`snowmelt-load` -> `computeSnowmeltLoad` in
`../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `radiant-loop-sizing` / `radiant-floor-output` /
`boiler-pipe-sizing`); `data/search/aliases.json` ("snowmelt", "snow melting system", "heated driveway", "snow melt
btu", "hydronic snow melting", "heated sidewalk", "snow free area ratio", "driveway heating load"); the id appended to
the hvac renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the A_r = 0 Class I reduction (losses drop out entirely), and the
error seams (non-finite, s / area <= 0, RH outside 0-100, negative wind, A_r outside 0-1, air above the film,
back-loss outside 0-99). Uses the existing `_rEnv` factory (all-number fields; A_r enters as the 0 / 0.5 / 1 ratio).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit (the component / total-flux / boiler stack wraps on a phone); render-no-nan +
a11y on the new tile, output read to the value (the Class II storm -> 110.7 Btu/hr-ft^2, 66.4 MBH).

## 5. Roadmap position

Executes the snowmelt follow-on spec-v199 §6 named and closes the exterior end of the hydronic bench: the boiler
(`boiler-pipe-sizing`) and its distribution (`radiant-loop-sizing`, `hydronic-gpm-deltat`) now have their outdoor load
beside the indoor one (`radiant-floor-output`). The remaining radiant follow-ons the same section named (panel
surface-temperature design, downward-loss detail) and an annual-energy / idling-cost mode stay deliberate future
follow-ons. Further Group C growth stays evidence-driven.
