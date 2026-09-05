# roughlogic.com Specification v1532 -- Well Control Kill Mud Weight and Circulating Pressure (`calc-oilgas.js`, Group E Carpentry and Construction, drilling, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** When a well kicks, the kill mud weight comes off the shut-in drillpipe pressure in one line. Every well control school teaches it and every kill sheet starts with it, and having it computed rather than done under pressure on a rig floor is exactly the point.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive original mud weight or true vertical depth, or a negative shut-in pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the standard kill-sheet relations with IADC and API well control standards named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`kill mud weight`, `sidpp kill sheet`, `well control kill weight`, `initial final circulating pressure`, `kill sheet calculation`.

## 2. The tile

### 2.1 `kill-mud-weight` -- Well Control Kill Mud Weight and Circulating Pressure

```
kill mud weight    KMW = MW_original + SIDPP / (0.052 x TVD)
initial circulating ICP = SIDPP + slow circulating rate pressure
final circulating  FCP = SCRP x (KMW / MW_original)
strokes to bit     drillpipe capacity x measured depth / pump output
formation pressure P_f = SIDPP + 0.052 x MW x TVD
```

Shut-in drillpipe pressure is the amount by which formation pressure exceeds the hydrostatic already in the
hole, read directly at surface through a column of clean mud. Converting that pressure back into mud weight is
the same 0.052 relation rearranged, and the result is the density that will balance the formation with no surface
pressure at all.

The circulating pressures follow. Initial circulating pressure is the shut-in pressure plus whatever it takes to
move mud at the slow rate; final circulating pressure is the slow-rate pressure scaled by the density ratio, since
a heavier mud takes proportionally more pressure to circulate. Between them the drillpipe pressure is walked down
on a schedule while the kill mud goes to the bit. Add a safety margin to kill weight if the operator's program
calls for one, but do it deliberately -- excessive kill weight risks fracturing the formation and turning a kick
into an underground blowout.

**Inputs:** original mud weight, true vertical depth, shut-in drillpipe pressure, slow circulating rate pressure and rate, drillpipe and annular capacities, measured depth, pump output, and any kill-weight safety margin

**Outputs:** the kill mud weight, the formation pressure, the initial and final circulating pressures, the strokes and time to the bit and to surface, the pressure schedule between ICP and FCP, and the equivalent mud weight at the shoe for a kick-tolerance check

## 3. Worked example

A well shut in on a kick: 12.5 ppg mud, 9,800 ft TVD, SIDPP 380 psi, slow circulating rate pressure
600 psi at 30 spm:

```
KMW = 12.5 + 380 / (0.052 x 9,800) = 12.5 + 0.75 = 13.25 ppg
P_f = 380 + 0.052 x 12.5 x 9,800      = 6,750 psi
ICP = 380 + 600                     = 980 psi
FCP = 600 x (13.25 / 12.5)             = 636 psi
```

Weight up to 13.2 ppg, start at 980 psi on the drillpipe, and walk down to 636 psi by the time
the kill mud reaches the bit. Hold 636 psi from there until the influx is out.

The margin question: 13.25 ppg is only 0.75 ppg above the original. Rounding up to 13.0 ppg "for
safety" adds `0.052 x (13.0 - 13.25) x 9,800` = -125 psi of extra bottom-hole pressure,
which has to be checked against the fracture gradient at the shoe before anyone does it.

## 4. Scope and non-goals

The standard kill-sheet arithmetic for a driller's or wait-and-weight kill on a vertical or near-vertical well
with a single-density mud system. It is a calculation aid and not a well control procedure, a substitute for
certification, or a substitute for the operator's own kill sheet. It assumes the shut-in drillpipe pressure is
read through a clean, gas-free drillpipe column; a plugged bit, a float in the string, or gas in the drillpipe
makes SIDPP wrong and every number downstream of it wrong. It does not evaluate kick tolerance, maximum allowable
annular surface pressure, or whether the fracture gradient at the shoe can hold the kill, and it does not handle
horizontal wells, tapered strings, multiple mud densities, or gas migration in a shut-in well. Well control is a
certified discipline and a kick is a life-safety event: the crew's well control certification, the operator's
program and kill sheet, IADC and API standards, and the regulator govern.
