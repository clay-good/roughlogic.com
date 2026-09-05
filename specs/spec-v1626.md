# roughlogic.com Specification v1626 -- Coil Capacity Verification From Measured Air and Water (`calc-hvacsystems.js`, Group C HVAC, test and balance, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvacsystems.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; test and balance, controls, and acoustics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A coil's capacity can be measured from the air side and from the water side independently, and the two should agree. When they do not, the disagreement itself is the diagnosis -- and it identifies which measurement is wrong far faster than repeating either one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive airflow, water flow, or temperature difference, or a leaving temperature that implies heat flow in the wrong direction returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the standard air-side and water-side capacity relations as governed by NEBB, AABC, and TABB procedure, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`coil capacity verification`, `air side water side heat balance`, `1.08 cfm delta t`, `500 gpm delta t`, `coil performance test`.

## 2. The tile

### 2.1 `coil-capacity-verification` -- Coil Capacity Verification From Measured Air and Water

```
air side, sensible   Q = 1.08 x CFM x (T_leaving - T_entering)
air side, total      Q = 4.5 x CFM x (h_leaving - h_entering)     (enthalpy, wet coil)
water side           Q = 500 x GPM x (T_leaving - T_entering)     (water, sea-level, 60 degF basis)
heat balance         the two should agree within roughly 5 to 10%
disagreement         points at a specific fault depending on its direction and size
```

The two independent measurements are the whole value of the exercise. Each uses different instruments,
different quantities, and different assumptions, so agreement is strong evidence that both are right and
disagreement localizes the problem. Air side high against water side means the airflow measurement is
overstated, or air is bypassing the coil and the leaving temperature is not representative. Water side high
against air side usually means the flow measurement is wrong or the temperature sensors are too close together
for the delta being measured.

The sensible-versus-total distinction is the trap on a cooling coil. A wet coil is removing latent heat, and a
sensible-only air-side calculation will fall well short of the water-side total for no reason other than the
method. On a wet coil the air side must be computed from enthalpy, which needs wet-bulb measurements on both
sides, and a report comparing sensible air against total water is comparing two different quantities.

The instrument that most often fails here is the water temperature difference. A 12 degF delta measured with
sensors accurate to a degree each carries a large percentage uncertainty, and on a low-delta system it can be
most of the disagreement -- which is why the water-side measurement is weakest exactly where hydronic systems
tend to run.

**Inputs:** airflow, entering and leaving air dry-bulb and wet-bulb temperatures, water flow, entering and leaving water temperatures, the fluid properties if not water, and the coil design capacity

**Outputs:** the air-side sensible and total capacity, the water-side capacity, the heat balance difference as a percentage, each against the coil design capacity, and a diagnostic indication of which measurement the disagreement implicates

## 3. Worked example

A cooling coil measured at 8,000 cfm with a 22 degF dry-bulb drop, and 40 gpm with a
12 degF water rise:

```
air side, sensible = 1.08 x 8,000 x 22 = 190,080 BTU/h
water side         = 500 x 40 x 12      = 240,000 BTU/h
difference         = 21%
```

The water side reads 21% higher -- and on a cooling coil that is expected, because the air-side
sensible calculation ignores the latent heat the coil is removing. Recomputing the air side from enthalpy:

```
air side, total = 4.5 x 8,000 x (h_in - h_out)
```

with a 5.5 BTU/lb enthalpy drop that gives `4.5 x 8,000 x 5.5` = 198,000 BTU/h, which is within
18% of the water side. **The coil is fine; the sensible-only comparison was the
error.**

Had the enthalpy-based air side still come in 25% low, the diagnosis would be different: air bypassing the coil
around a poorly sealed frame, a dirty coil with channelled flow, or an airflow measurement taken where the
profile is not developed.

## 4. Scope and non-goals

A heat-balance comparison from measurements the user supplies. The constants 1.08, 4.5, and 500 assume standard
air density and water properties at nominal conditions; altitude, high temperature, and glycol all change them,
and a glycol system needs the actual specific heat and specific gravity or the water-side result is wrong by
10 percent or more. On a wet coil the air side must be computed from enthalpy and requires accurate wet-bulb or
dewpoint measurement, which is harder than dry-bulb and is where most air-side error originates. Water
temperature difference measurement carries large percentage uncertainty on low-delta systems, and matched sensors
or a single differential instrument are what make it credible. It does not evaluate coil condition, fouling, or
air bypass directly, and it does not correct measured capacity to design conditions, which is required before
comparing against a rated capacity. The applicable balancing standard, the coil manufacturer's rating conditions,
and the certified technician govern.
