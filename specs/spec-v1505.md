# roughlogic.com Specification v1505 -- Framing Factor and Whole-Wall Effective R-Value (`calc-buildingperf.js`, Group C HVAC, building performance, 1 New Tile)

> **Status: CUT 2026-09-09 as a duplicate.** `assembly-r-value` already computes
> the parallel-path U-average with a `framing_factor` input, already carries a
> continuous-insulation layer and counts it on BOTH paths, and already reports the
> bridging percentage -- this spec's entire content, under the same method. The
> two things it added that that calculator did not have -- the AREA-WEIGHTED
> R-value average (the wrong method) computed beside the correct one, which that
> tile's own note warned about without ever computing, and a second framing factor
> so the two fixes compare in one answer -- landed there as a follow-up instead,
> additively, so its previous answer is unchanged.
>
> **One correction to this spec.** It says adding R-6 continuous to the original
> wall "gives R-20.4, a gain of 6.0", i.e. straight addition, and calls that the
> point that "its nominal R and its delivered R are the same number." That is an
> UNDERSTATEMENT. Continuous insulation sits on both paths and lifts the weak
> framing path proportionally the most, so the correct parallel-path result is
> **R-21.56, a gain of 7.30 -- more than its nominal R.** The existing tile's own
> note had this right ("it buys more than its nominal R") before this spec was
> written. Everything else in the spec recomputes exactly: R-14.4 whole-wall,
> R-17.8 area-weighted, 24% overstatement, and 1.5 R from advanced framing.
> Aliases route this question to `assembly-r-value`. Single-tile spec. Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-buildingperf.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; building performance and envelope diagnostics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A wall built with R-21 batts is not an R-21 wall. Studs, plates, headers, and corners are a quarter of its area at about R-7, and the parallel path through them drags the assembly's real performance down by a third. Nominal R-value is the number on the bag; whole-wall R is the number the building feels.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a framing factor outside zero to one, or a non-positive cavity or framing R-value returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the parallel-path whole-wall relation from ASHRAE Fundamentals by name, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`whole wall r value`, `framing factor thermal bridging`, `parallel path r value`, `effective r value wall`, `stud thermal bridge`.

## 2. The tile

### 2.1 `framing-factor-whole-wall` -- Framing Factor and Whole-Wall Effective R-Value

```
framing factor   FF = framed area / total wall area
parallel path    U_wall = (1 - FF) / R_cavity + FF / R_framing
whole wall       R_whole = 1 / U_wall
typical FF       0.16 advanced framing, 0.23 conventional 16 in oc, 0.27+ with many openings
```

Heat takes the easy path, and a stud is a hole in the insulation as far as heat is concerned. Because the paths
are in parallel the U-values add by area, not the R-values -- averaging R-values weighted by area gives a
noticeably wrong and always optimistic answer, and it is a common mistake.

The framing factor is bigger than people guess. Every stud, every plate, every header over every opening, every
corner and every intersection is framing, and conventional 16 in on center construction with normal window
counts lands near 23% of wall area. Advanced framing -- 24 in on center, two-stud corners, insulated headers,
single top plates -- gets it toward 16%, which is worth more real R-value than a batt upgrade and costs less
lumber. And this is exactly why continuous exterior insulation is so effective: it covers the framing too, so it
is the only insulation that gets the whole area.

**Inputs:** cavity R-value, framing R-value through the studs and plates, the framing factor, and optionally a continuous exterior R-value to add

**Outputs:** the whole-wall U-factor and R-value, the percentage lost to thermal bridging, the whole-wall R with a stated continuous insulation added, and the framing factor that would be needed to reach a target whole-wall R

## 3. Worked example

An R-21 cavity wall with 2x6 framing at R-7 through the studs, conventional framing at FF = 0.23:

```
U_wall  = (1 - 0.23) / 21 + 0.23 / 7
        = 0.03667 + 0.03286 = 0.06952
R_whole = 1 / 0.06952            = R-14.4
```

R-21 on the bag, **R-14.4 in the wall** -- 32% lost to the studs. The area-weighted R-value
average, which is the wrong method, would have given
`0.23x7 + 0.77x21` = R-17.8, overstating the wall by 24%.

Two fixes, compared. Advanced framing at FF = 0.16 gives R-15.9, a gain of
1.5. Adding R-6 continuous exterior to the original wall gives
R-20.4, a gain of 6.0 -- because continuous insulation is the only layer that covers the studs too, its
nominal R and its delivered R are the same number.

## 4. Scope and non-goals

A two-path parallel calculation for the opaque wall. It does not use the isothermal planes or zone method that
ASHRAE prescribes for assemblies with highly conductive layers such as steel framing, where a simple parallel
path substantially understates the bridging -- steel studs need the correction factors, not this. It does not
account for windows, doors, band joists, or the wall-to-roof and wall-to-foundation junctions, which are separate
and often severe bridges; a true whole-building envelope analysis includes linear and point transmittances this
tile does not model. It does not evaluate condensation risk, which is `vapor-retarder-dewpoint` and
`continuous-insulation-ratio`, and a wall optimized for whole-wall R without that check can be a wetter wall.
ASHRAE Fundamentals, the adopted energy code's compliance path, and the energy modeler govern.
