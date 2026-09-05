# roughlogic.com Specification v1492 -- CO2 Transcritical Gas Cooler Optimum Pressure (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Above CO2's 87.8 degF critical temperature there is no condensing -- the gas cooler just cools gas, and the discharge pressure becomes a free variable with a genuine optimum. Run it too low and capacity collapses; too high and the compressor eats the gain. No other refrigerant behaves this way and nothing in the catalog handles it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive gas cooler outlet temperature, or an outlet temperature below the critical temperature where the transcritical optimum does not apply returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the CO2 critical point and a published transcritical optimum-pressure correlation, with ASHRAE 15 named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`co2 transcritical pressure`, `r744 optimum high side`, `gas cooler pressure optimum`, `transcritical booster control`, `co2 critical point refrigeration`.

## 2. The tile

### 2.1 `co2-transcritical-pressure` -- CO2 Transcritical Gas Cooler Optimum Pressure

```
critical point     87.8 degF, 1,071 psia -- above this there is no condensation
optimum pressure   P_opt ~ 2.6 x T_gc_out(degC) + 7.54  (bar), a widely used correlation
                   converted to psi and degF in the tile
approach           T_gc_out = T_ambient + gas cooler approach
subcritical        below the critical temperature it condenses normally; the optimum does not apply
```

In a transcritical cycle the high side is a single-phase gas being cooled, so pressure and temperature are
independent -- unlike a condenser, where fixing one fixes the other. Raising discharge pressure at a fixed gas
cooler outlet temperature moves the cycle into a region where CO2's isotherms bend sharply, which increases the
refrigerating effect per pound substantially. But it also increases compressor work. The two effects cross, and
the crossing point is the optimum.

The optimum depends almost entirely on gas cooler OUTLET temperature, which is ambient plus the gas cooler's
approach -- so the control strategy is to measure that outlet temperature and float the high-side pressure to
match it, continuously. A fixed high-side pressure setting is leaving efficiency on the table at every ambient
except one. On a cool day the system drops below the critical temperature entirely and reverts to ordinary
subcritical condensing, where this arithmetic does not apply at all.

**Inputs:** ambient temperature, gas cooler approach or the outlet temperature directly, evaporating temperature, and optionally the compressor isentropic efficiency

**Outputs:** the gas cooler outlet temperature, whether the cycle is transcritical or subcritical, the optimum high-side pressure in psig and bar, the corresponding pressure ratio, and the sensitivity of capacity to pressure either side of the optimum

## 3. Worked example

A CO2 rack on a 95 degF day with a 5 degF gas cooler approach:

```
T_gc_out = 95 + 5 = 100 degF = 37.8 degC   -> above 87.8 degF, TRANSCRITICAL
P_opt    = 2.6 x 37.8 + 7.54 = 105.8 bar  = 1,534 psia = 1,520 psig
```

Just over 1,500 psig, which is why transcritical CO2 equipment is built to pressure ratings no other
supermarket refrigerant needs and why its service procedures are different.

Now a cool morning, 55 degF ambient, same approach:

```
T_gc_out = 60 degF -> BELOW the critical temperature: the cycle is subcritical
```

The high side condenses normally, the optimum-pressure correlation does not apply, and the control should be
floating head pressure against condensing temperature instead. A controller that applied the transcritical
formula at 60 degF would command a pressure hundreds of psi above what the cycle needs.

## 4. Scope and non-goals

The optimum high-side pressure from a published correlation, plus the transcritical-versus-subcritical
determination. The correlation is an empirical fit and different sources give slightly different coefficients;
it approximates the true optimum from a cycle analysis and does not replace one. It does not model the flash gas
bypass, ejectors, parallel compression, or adiabatic gas cooler enhancements that modern transcritical racks use
and that shift the optimum, and it does not size any component. It does not compute capacity or COP. CO2's high
operating pressures, its standstill pressure rise when a system is shut down warm, and the asphyxiation hazard of
a large release in a confined space are all safety matters this tile does not address. The equipment
manufacturer's control logic and pressure ratings, ASHRAE 15, and the system designer govern.
