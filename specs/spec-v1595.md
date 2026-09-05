# roughlogic.com Specification v1595 -- Propane Run Time and Refill Interval (`calc-gas.js`, Group B Plumbing and Gas, propane, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-gas.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; propane and lp-gas service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** How long a tank lasts is a division, and it is the question every propane customer actually asks. The useful answer includes the reserve -- deliveries are scheduled well before empty -- and adjusts for the fact that a furnace does not run continuously.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive tank capacity, fill fraction, or load, or a duty cycle or reserve fraction outside zero to one returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the energy content and run-time relations with NFPA 58 and the gas supplier procedures named, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`propane run time`, `how long will my propane last`, `propane tank days remaining`, `gallons per degree day propane`, `propane delivery interval`.

## 2. The tile

### 2.1 `propane-run-time` -- Propane Run Time and Refill Interval

```
energy in tank   E = usable gallons x 91,500 BTU/gal
run time         t = E / connected load          (continuous firing)
realistic        divide by the duty cycle: a furnace at design runs perhaps 60 to 80%,
                 and far less in mild weather
degree days      a better estimate scales consumption with heating degree days
reserve          deliveries are triggered well above empty, commonly at 20 to 30%
usable           the last of the liquid may not vaporize fast enough in cold weather
```

The continuous-firing number is a floor and it is what people compute; the realistic number needs a duty cycle,
because heating equipment cycles. A furnace sized for design conditions runs a fraction of the time in
average weather, so a continuous-firing estimate can understate tank life by a factor of three or more in
October and be roughly right in a January cold snap.

Degree days are the honest way to do it. Consumption is very nearly proportional to heating degree days, so a
customer's own gallons-per-degree-day from last year's deliveries predicts this year's far better than any
appliance rating -- and it automatically includes the water heater, the range, and everything else on the tank.

The reserve matters for the delivery schedule rather than for the arithmetic. Running a tank to empty means
purging and leak-testing before it is refilled, and it means the last portion of the tank was struggling to
vaporize anyway. A trigger around 25 to 30% is normal, and the run time to that trigger, not to zero, is the
number a delivery schedule is built on.

**Inputs:** tank water capacity and fill fraction, current gauge reading, connected load and duty cycle, the delivery trigger percentage, and optionally historical gallons and degree days

**Outputs:** the usable energy in the tank, the continuous-firing run time, the realistic run time at the entered duty cycle, the time to the delivery trigger, the consumption rate in gallons per day, and the run time predicted from a gallons-per-degree-day history

## 3. Worked example

A 500 gallon tank filled to 80% serving a 150,000 BTU/h furnace:

```
usable gallons = 500 x 0.8 = 400 gal
energy         = 400 x 91,500 = 36.6 MMBTU
continuous     = 36.6 MMBTU / 0.15 MMBTU/h = 244 hours = 10.2 days
```

10.2 days if the furnace never stops -- which it never does. At a 35% seasonal average duty cycle:

```
realistic = 10.2 / 0.35 = 29 days
```

About 29 days, or roughly 1.0 months of heating season.

The delivery schedule uses the trigger, not empty. From full (80%) down to a 30% gauge reading:

```
gallons used = (0.8 - 0.30) x 500 = 250 gal
days         = 250 / (400 / 29) = 18 days
```

18 days between deliveries at that duty cycle -- and far fewer in a cold
snap, which is why a degree-day history beats an appliance-rating estimate for scheduling.

## 4. Scope and non-goals

An energy and duration estimate. The duty cycle is the dominant uncertainty and it varies with weather,
thermostat setting, building envelope, and equipment oversizing; a seasonal average badly misstates both the
mild-weather and design-day cases. The 91,500 BTU per gallon figure is a nominal value and varies slightly with
composition and temperature. It does not account for the other appliances on the tank, which a degree-day history
does automatically and an appliance-rating calculation does not. It does not evaluate whether the tank can
vaporize the load, which is a separate and often binding constraint in cold weather
(`propane-vaporization-rate`), and it does not address the operational reasons not to run a tank to empty:
purging, leak testing, and requalification after an out-of-gas condition are the supplier's procedures. NFPA 58,
the gas supplier, and the appliance manufacturers govern.
