# roughlogic.com Specification v1536 -- Two-Phase Separator Retention Sizing (`calc-oilgas.js`, Group B Plumbing and Gas, oil and gas production, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-oilgas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; oil, gas, and pipeline), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A separator works by holding fluid still long enough for gas to break out and water to fall, and that hold is retention time. Undersize it and the separator passes gas in the oil line and oil to the water leg, which is the most common production headache there is.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive liquid or gas rate, retention time, vessel diameter, or density, or a gas density at or above the liquid density returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the retention-time and Souders-Brown relations with API 12J and ASME Section VIII named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`separator sizing retention time`, `two phase separator`, `souders brown separator`, `oil gas separator capacity`, `separator carryover sizing`.

## 2. The tile

### 2.1 `separator-retention-sizing` -- Two-Phase Separator Retention Sizing

```
liquid volume needed  V = Q_liquid x retention time
retention time        oil 1 to 3 min typical; heavier and foamy oils need much more
                      oil-water separation 3 to 10 min depending on gravity difference
gas capacity          from the settling (Souders-Brown) velocity across the vapour space
                      v_max = K sqrt( (rho_L - rho_G) / rho_G )
governing             the vessel must satisfy BOTH the liquid and the gas requirement
```

Two independent requirements sit in one vessel and either can govern. The liquid side is pure residence time:
flow rate times the minutes needed, which sets the liquid volume below the interface. The gas side is a velocity
limit: gas moving faster than the settling velocity of a droplet re-entrains liquid and carries it out the gas
line, which sets the vessel's cross-sectional area.

A vessel sized only on liquid retention can be far too small in diameter for its gas rate, and the symptom is
liquid carryover into the gas line and eventually into a compressor. A vessel sized only on gas can be too short
for the liquid to degas, and the symptom is gas breaking out downstream in the oil line and upsetting the tank
battery. The tile reports both so the governing case is visible.

Foam is the wild card. A foaming crude can need several times the nominal retention, and no diameter fixes it --
the answer is a defoamer, an internal, or a much larger vessel, and a separator that worked on one well can fail
on another from the same field.

**Inputs:** liquid and gas flow rates, required retention time, operating pressure and temperature, liquid and gas densities, the K factor, and the vessel diameter and seam-to-seam length

**Outputs:** the liquid volume required and the volume the vessel provides, the actual retention time achieved, the maximum gas velocity and the vessel gas capacity, the actual gas velocity as a percent of maximum, and which requirement governs

## 3. Worked example

A horizontal separator, 4 ft diameter by 12 ft seam to seam, half full of liquid, handling 1,200 bbl/day of
oil and 3.5 MMSCFD of gas at 400 psig:

```
liquid volume at half full = (pi/4)(4^2)(12) / 2  = 75.4 cu ft = 13.4 bbl
liquid rate                = 1,200 / 1,440        = 0.833 bbl/min
retention time             = 13.4 / 0.833         = 16.1 minutes
```

Sixteen minutes is generous for a light oil needing 2 to 3, so the liquid side has ample margin -- this vessel is
not liquid-limited.

The gas side is the question. The vapour space is the upper half of a 4 ft diameter vessel, and the gas velocity
across it at 3.5 MMSCFD and 400 psig has to be checked against the Souders-Brown limit. If the calculated
velocity exceeds `K sqrt((rho_L - rho_G)/rho_G)`, the separator carries liquid into the gas line regardless of
those sixteen minutes of retention. **Gas governs this vessel**, and the fix is a larger diameter or a mist
extractor, not a longer one.

## 4. Scope and non-goals

Retention-time and settling-velocity screening for a two-phase separator. It does not perform a separator
design: internals (inlet diverter, mist extractor, vortex breaker, weirs), the K factor appropriate to the
internals and service, foaming and emulsion behaviour, slug handling and surge volume, level control, and the
liquid-liquid separation of an oil-water interface all determine whether a vessel works and none is evaluated
here. Three-phase separators have a separate water-retention requirement that usually governs the length. It does
not size relief, which is separately required, or address the pressure vessel design itself. Real retention
requirements come from the crude's own tested behaviour, not from a table. API 12J, ASME Section VIII for the
vessel, and a qualified facilities engineer govern.
