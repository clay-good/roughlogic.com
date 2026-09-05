# roughlogic.com Specification v1537 -- Flare Thermal Radiation Safe Distance (API 521) (`calc-oilgas.js`, Group B Plumbing and Gas, oil and gas production, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A flare radiates heat, and the distance at which that heat is survivable for a person or safe for equipment is what sets the exclusion radius and the fence line. It is an inverse-square relation with a fraction-of-heat-radiated term, and it is the calculation behind every flare setback on a plot plan.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive heat release, radiant fraction, or allowable radiation level, or a radiant fraction above one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): API 521 radiation criteria by name including the solar contribution, with API 537 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`flare radiation distance`, `api 521 flare setback`, `thermal radiation exclusion zone`, `flare exclusion radius`, `radiant heat flare sizing`.

## 2. The tile

### 2.1 `flare-radiation-distance` -- Flare Thermal Radiation Safe Distance (API 521)

```
radiated heat     Q_rad = F x Q_total          (F the radiant fraction, 0.1 to 0.3 by gas)
distance          D = sqrt( F x Q / (4 pi K) )
K                 the allowable radiation level at the target
API 521 levels    500 BTU/h-sq ft: continuous exposure, personnel
                  1,500: brief exposure with escape, personnel
                  3,000: equipment and structures, no personnel
solar             ambient solar radiation is ADDED to the flare's contribution
```

Only a fraction of a flare's heat release leaves as radiation -- the rest goes up with the plume -- and that
fraction depends on the gas: light hydrocarbons radiate around 0.1 to 0.15, heavier and sootier gases up to 0.3.
Beyond that it is inverse square, so halving the allowable radiation multiplies the required distance by 1.41,
not by 2.

Two things routinely get left out. Solar radiation is added, not ignored: on a clear day the sun contributes on
the order of 250 to 300 BTU/h per sq ft, which against a 500 BTU/h-sq ft personnel criterion is more than half
the budget before the flare is lit. And wind tilts the flame, moving the effective radiating centre downwind and
lower, which increases radiation on the downwind side substantially -- the still-air calculation is not the
governing case.

The criterion has to match the target. A fence line where the public may stand, a control room, a walkway an
operator uses during an emergency, and a vessel that must survive the event are four different numbers, and using
the equipment figure for a place people stand is the error that matters.

**Inputs:** total heat release rate, the radiant fraction for the gas, the allowable radiation level for the target, the solar contribution, and optionally the flame length and wind tilt

**Outputs:** the radiated heat, the required distance for each API 521 criterion, the radiation level at a stated distance, the effect of adding the solar contribution, and the heat release that a fixed available distance supports

## 3. Worked example

A flare releasing 250 MMBTU/h with a radiant fraction of 0.15, checked against the 1,500 BTU/h-sq ft
brief-exposure criterion, with 300 BTU/h-sq ft of solar already present:

```
Q_rad          = 0.15 x 250,000,000        = 37,500,000 BTU/h
budget at target = 1,500 - 300 (solar)     = 1,200 BTU/h-sq ft available to the flare
D = sqrt(37,500,000 / (4 pi x 1,200))      = sqrt(2,487) = 49.9 ft
```

Fifty feet on the brief-exposure criterion. Now the continuous-exposure criterion for personnel, 500 BTU/h-sq ft,
with the same 300 of solar leaving only 200 for the flare:

```
D = sqrt(37,500,000 / (4 pi x 200)) = sqrt(14,921) = 122 ft
```

**122 ft instead of 50** -- and the entire difference is the criterion, not the flare. Ignoring the solar
contribution would have given 97 ft for the same criterion, understating the required setback by 25 ft, which is
exactly the kind of omission that puts a walkway inside an exclusion zone.

## 4. Scope and non-goals

A simple point-source radiation screen. It does not use the API 521 flame length, tilt, and radiating-centre
model, which locates the effective source somewhere along a wind-tilted flame rather than at the tip and which is
what a real flare study computes; the point-source result can be substantially non-conservative on the downwind
side. It does not evaluate ground-level concentration of unburned gas or products of combustion, flame-out and
the dispersion case that follows, noise, or the liquid carryover that produces burning rain. Radiant fractions
are gas-specific and must come from data for the actual composition. Emergency and relief flaring rates, not
normal rates, govern the design. API 521, API 537, and a qualified flare designer govern.
