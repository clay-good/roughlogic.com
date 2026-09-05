# roughlogic.com Specification v1489 -- Air-Cooled Condenser TD and Head Pressure (`calc-refrigeration.js`, Group C HVAC, industrial refrigeration, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigeration.js`**
> (Group C, HVAC -- the existing category, hub `/groups/hvac/`; industrial and commercial refrigeration), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Condenser TD sets head pressure, head pressure sets compressor power, and compressor power is most of a refrigeration plant's electric bill. The relation between the three is where an oversized condenser pays for itself, and it is arithmetic a service tech can act on with a thermometer and a gauge.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive UA or heat rejection, or a condensing temperature at or below the ambient basis temperature returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the condenser TD relation with the wet-bulb basis for evaporative condensers as standard practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`condenser td`, `head pressure condensing temperature`, `condenser approach`, `evaporative condenser wet bulb`, `floating head pressure savings`.

## 2. The tile

### 2.1 `condenser-td-head-pressure` -- Air-Cooled Condenser TD and Head Pressure

```
condensing temp   T_cond = T_ambient + TD
capacity          Q_rej = UA x TD
heat rejected     Q_rej = Q_evap + W_compressor
power effect      roughly 1.5 to 2% compressor power per degF of condensing temperature
evaporative       TD measured from WET BULB, not dry bulb
```

An air-cooled condenser's TD is measured from dry bulb and typically designed at 10 to 20 degF; an evaporative
condenser's is measured from WET bulb, which in most US summers is 15 to 25 degF below dry bulb and is the whole
reason evaporative condensing wins on hot days. Confusing the two bases is the most common error in the field
and it produces a diagnosis that is off by the entire wet-bulb depression.

Because capacity is linear in TD but compressor power responds to condensing TEMPERATURE, a bigger condenser has
leverage: dropping TD from 20 to 15 degF lowers condensing temperature 5 degF and cuts compressor power roughly
8 to 10%, continuously, for the life of the plant. That is why a dirty or undersized condenser is expensive
rather than merely annoying, and why floating head pressure control -- letting condensing follow ambient down
instead of holding it artificially high -- is the standard energy retrofit.

**Inputs:** ambient dry bulb or wet bulb as appropriate to the condenser type, condensing temperature or the design TD, heat of rejection, the condenser UA or published capacity, and the compressor power sensitivity

**Outputs:** the condensing temperature, the TD on the correct basis, the heat rejection at that TD, the condensing temperature at an alternative ambient, and the compressor power change between two condensing temperatures

## 3. Worked example

An evaporative condenser on a 78 degF wet-bulb design day, TD 20 degF:

```
T_cond = 78 + 20 = 98 degF condensing
```

An air-cooled condenser at the same site sees a 95 degF DRY bulb, and at a 15 degF TD condenses at 110 degF --
12 degF hotter for a tighter TD, purely because of the basis. At roughly 1.75% compressor power per degF, that
12 degF is about 21% more compressor power for the same refrigeration effect.

Now the retrofit case. Add condenser surface until the evaporative unit runs a 15 degF TD instead of 20, and
condensing falls from 98 to 93 degF: 5 degF, about 8.75% of compressor power, every hour the plant runs. On a
300 hp compressor at 6,000 hours and $0.09/kWh that is roughly $10,600 a year.

## 4. Scope and non-goals

A TD and head-pressure screen using a linear UA and a linear power sensitivity. The power-per-degree figure is
a rule of thumb that varies with refrigerant, compressor type, and operating point, and a compressor
manufacturer's performance map supersedes it. It does not select or size a condenser, does not model fan power
(which rises as TD is reduced and partly offsets the compressor saving, so the true optimum is a total-power
minimum this tile does not find), and does not model evaporative condenser water consumption, blowdown, or water
treatment. Minimum condensing temperature limits set by the expansion device, oil return, and hot-gas defrost
requirements constrain how far head pressure may float and are not checked here. Non-condensable gases in the
system raise head pressure independently of TD and read as a fouled condenser. The equipment manufacturer's
ratings and the system designer govern.
