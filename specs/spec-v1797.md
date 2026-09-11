# roughlogic.com Specification v1797 -- Waste Settlement and Recovered Airspace (`calc-waste.js`, Group M Water and Wastewater Operations, solid waste and landfill operations, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-waste.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** A landfill sinks by a fifth of its depth over its life, and that is airspace the site can sell -- but only the part that settles while the fill is still open. The rest lowers the final cover, and where it settles unevenly it can reverse the drainage the cap depends on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive thickness, area, density, or tipping fee, settlement fractions outside 0 to 1, or a non-positive slope or run length returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): published municipal solid waste settlement ranges and the primary and secondary settlement convention with a site-specific geotechnical analysis and the approved grading plan named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`landfill settlement`, `recovered airspace settlement`, `waste primary secondary settlement`, `differential settlement landfill cap`, `final cover grade settlement`.

## 2. The tile

### 2.1 `landfill-settlement-airspace` -- Waste Settlement and Recovered Airspace

```
total settlement commonly 15 to 30% of the waste thickness over the life of the fill
primary          mechanical compression under the overburden, 5 to 10%; it happens
                 within weeks to months of placement
secondary        biodegradation and creep, 10 to 20%; it continues for decades and
                 most of it occurs AFTER closure
recovered        settlement that occurs while the cell is still open can be refilled
airspace         and sold: volume = primary settlement x area / 27
not recovered    settlement after closure lowers the cap; it produces no airspace
differential     unequal settlement between a deep area and a shallow one, or over
                 a buried structure, and it is what damages a cap
cap grades       a final cover is graded to shed water; differential settlement can
                 flatten or reverse that grade and pond water on the cap
```

Settlement is simultaneously an asset and a hazard, and which one it is depends entirely on when it happens.
Compression that occurs while a cell is open leaves room the site can fill again, and over a large area that
is a large quantity of saleable airspace at no cost. The same compression after the cap is placed produces
nothing but a lower, flatter, and possibly ponded surface, and the site has to maintain it for as long as
post-closure care runs.

The two mechanisms are on different clocks and that is what separates the asset from the liability. Primary
compression is mechanical and quick: place a lift on top and the waste below responds in weeks. Secondary
settlement is biological, tracks the same decomposition that generates gas, and runs on the same decadal
timescale -- so most of it is still to come on the day the site closes.

Differential settlement is where the engineering actually lives. Uniform settlement lowers a cap without
harming it; unequal settlement between a hundred-foot fill and a fifty-foot one, or across an old cell
boundary, tilts the surface and can flatten or reverse the drainage it was graded for. Ponded water on a cap
infiltrates, which puts leachate back into a closed cell, which is the failure that post-closure care exists to
prevent. Final grades are designed with settlement added back in for exactly this reason.

**Inputs:** the waste thickness, the filled area, the primary and secondary settlement fractions, the in-place density, the tipping fee, the cap drainage slope and run length, and a second waste thickness for the differential check

**Outputs:** the total, primary, and secondary settlement in feet, the total volume the settlement represents, the airspace recoverable while the cell is open, the tonnage and revenue that airspace carries, the fall a designed cap slope provides, and the differential settlement against a second fill thickness

## 3. Worked example

A 50 acre cell filled 100 ft deep, settling 8% primary and 12% secondary:

```
total settlement   = 100 x 0.20 = 20 ft
primary            = 8 ft (weeks to months)
secondary          = 12 ft (decades, mostly after closure)
total volume       = 20 x 2,178,000 / 27 = 1,613,333 cy
```

**1,613,333 cubic yards of volume created by the waste sinking.** Only part of it is airspace:

```
recoverable (primary, while open) = 8 x 2,178,000 / 27 = 645,333 cy
at 0.60 tons per cy            = 387,200 tons
at $45 a ton                     = $17,424,000
```

**$17,424,000 of revenue from settlement that happened while the cell was still open** -- capacity the site
never permitted, never excavated, and never paid for. That is the case for filling in lifts and coming back
over a cell rather than closing it as soon as it reaches grade.

**The other 968,000 cubic yards are not airspace.** The 12 ft of secondary settlement arrives after the cap
is on, and all it does is lower the cover and the final grades.

**Which is where the hazard is.** A cap graded at 4% over a 300 ft run has:

```
design fall = 300 x 0.04 = 12 ft
```

**12 ft of fall to shed water.** Now run that slope from the 100 ft fill onto an adjacent 50 ft area:

```
100 ft fill settles 20 ft;  50 ft fill settles 10 ft
differential = 10 ft
remaining fall = 12 - 10 = 2 ft over 300 ft = 0.67%
```

**The slope survives -- barely.** 10 ft of differential eats 83% of the design fall and leaves the cap
draining at 0.67%, **below the 2 percent minimum most regulations require** and far below what it was built
to. It does not pond, and it no longer sheds water the way the design intended either.

**A slightly deeper fill or a slightly flatter starting grade takes it past zero and reverses it**, and then the
cap ponds, the water infiltrates, and a closed cell starts making leachate again. **Final grades are designed
with the settlement added back in**, which is why a freshly capped landfill looks steeper than the drawing and
why the differential, not the total, is the number that governs the cap.

## 4. Scope and non-goals

A planning estimate. Settlement fractions are entered and are highly variable: they depend on the waste composition, the in-place density achieved, the moisture regime, the fill thickness and its loading history, and the presence of a leachate recirculation or bioreactor operation, and the range across real sites is wide enough that a site-specific estimate from a geotechnical engineer is what a design uses. The split between primary and secondary is a simplification of a continuous process; real settlement is modelled with time-dependent relations and calibrated against survey monuments. It does not predict the rate or the time course, which is what a cap design actually needs, and it does not address settlement of the liner system or the subgrade beneath the waste, which is a separate foundation problem. It does not evaluate slope stability, which settlement affects, or the strain that differential settlement imposes on a geomembrane, a gas collection line, or a leachate collection pipe -- those are the components that fail first and they are designed by strain rather than by grade. It does not address whether a settled cell may lawfully be refilled, which depends on the permit and the approved fill plan. A site-specific geotechnical settlement analysis, survey monument records, the operating permit and approved grading plan, and the site engineer govern.
