# roughlogic.com Specification v1414 -- Evaporator Defrost Heat and Cycle Time (calc-refrigerant.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog has evaporator design TD, walk-in heat load, and product pull-down but nothing about defrost, which is what actually limits a freezer coil's run time. The heat required is a sum of three terms nobody adds up, and the resulting cycle time is what a controller is set to -- usually by guess.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive frost mass, coil mass, or defrost heater rating, a defrost efficiency outside 0-1, or a coil temperature above the frost melting point, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the latent heat of fusion of ice (144 BTU/lb), the sensible heat of ice and of the coil mass, and the electric and hot-gas defrost practice for refrigeration coils, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `defrost-cycle-sizing` -- Evaporator Defrost Heat and Cycle Time

```
sensible ice   = frost mass x 0.5 BTU/lb-F x (32 - coil temperature)
latent melt    = frost mass x 144 BTU/lb
coil warm-up   = coil mass x specific heat x temperature rise
total heat     = (sensible + latent + coil warm-up) / defrost efficiency
defrost time   = total heat / heater rating
frost per cycle= moisture removal rate x run time between defrosts
```

Three terms, and they are not the same size. The latent term dominates -- melting ice costs 144 BTU/lb against
about 21 BTU/lb to warm it from a freezer coil's temperature up to 32 F -- but the coil warm-up term is the one
that gets forgotten, and on a large coil with heavy fin stock it is real. Defrost efficiency captures everything
that is *not* melting frost: heat going into the box instead of the coil, into the drain pan, and out through the
insulation, and it is commonly only 60% to 80% on electric defrost.

The last line closes the loop. Frost accumulates at the coil's moisture removal rate, which is set by the box's
latent load -- door openings, product respiration, infiltration. That determines how much frost is on the coil
when defrost initiates, which determines how long defrost takes. A box with heavy traffic needs more defrosts, and
each one is longer, and every minute of defrost is a minute of heat going into a freezer.

**Inputs:** frost mass per cycle (or moisture removal rate and run time), coil temperature, coil mass and specific
heat, coil temperature rise during defrost, defrost heater rating (W or BTU/hr), defrost efficiency.

**Outputs:** sensible, latent, and coil warm-up heat separately; total defrost heat; defrost time; and the box
heat gain the defrost adds.

## 3. Worked example

A freezer coil at -10 F carrying 20 lb of frost per cycle, 60 lb of coil mass warmed 60 F at 0.10 BTU/lb-F, a
3 kW electric defrost heater (10,236 BTU/hr), 80% defrost efficiency:

```
sensible ice = 20 x 0.5 x 42        = 420 BTU
latent melt  = 20 x 144             = 2,880 BTU
coil warm-up = 60 x 0.10 x 60       = 360 BTU
total        = (420 + 2,880 + 360) / 0.80 = 4,575 BTU
defrost time = 4,575 / 10,236       = 0.447 hr = 26.8 min
```

Twenty-seven minutes, which lines up with the 20 to 30 minute terminations most freezer controllers are set to --
so the guess happens to be about right here, and the tile shows why. But halve the frost load to 10 lb by fixing a
door gasket and the defrost falls to 14.7 min, and doubling it to 40 lb pushes it to 51.0 min. The controller's
fixed termination time is right for exactly one frost load, which is the argument for demand defrost.

## 4. Scope and non-goals

An energy balance, not a controller specification. It does not model the temperature-terminated and
demand-defrost strategies that most modern systems use in place of a fixed time, the drain line and its heat
trace (a freezing drain line is the most common defrost failure), the pump-down or hot-gas sequences, or the fan
delay after defrost that keeps water off the product. Frost mass per cycle is an operating measurement, not a
computation, and it varies enormously with door discipline. Hot-gas defrost has a completely different energy
path and efficiency. The equipment manufacturer and the refrigeration contractor govern.
