# roughlogic.com Specification v1719 -- Baghouse Pressure Drop and Pulse Cleaning Interval (`calc-airquality.js`, Group G Cross-Trade Utilities, air quality, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-airquality.js`**
> (Group G, Cross-Trade Utilities -- the existing category, hub `/groups/cross-trade/`; air quality and environmental), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A baghouse's differential pressure rises as dust builds on the bags and falls when they are cleaned, and the cycle between them is what a well-run unit looks like. A pressure that will not come down after cleaning is the signal that the bags are blinding.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pressure differential or cleaning interval, or a baseline pressure exceeding the trigger returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the differential pressure cycling and blinding diagnostic as standard fabric filter practice, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`baghouse differential pressure`, `pulse jet cleaning interval`, `bag blinding rising baseline`, `on demand versus timer cleaning`, `baghouse pressure drop range`.

## 2. The tile

### 2.1 `baghouse-cleaning-interval` -- Baghouse Pressure Drop and Pulse Cleaning Interval

```
pressure drop     rises with the dust cake; the cleaning system removes the cake
cleaning trigger  by differential pressure (on demand) or by timer
                  on-demand cleaning is preferred; timer cleaning over-cleans
baseline          the clean-bag pressure drop after cleaning; it should return to a
                  stable baseline every cycle
blinding          a rising BASELINE means the cake is not releasing -- the bags are
                  blinding and will not recover
cleaning energy   pulse air is compressed air; over-cleaning wastes it and shortens
                  bag life by flexing the fabric
over-cleaning     also removes the residual cake that does the fine filtration
```

The baseline is the diagnostic, not the peak. A healthy baghouse cycles between a clean-bag pressure and a
trigger pressure, and the clean-bag value is stable over weeks. When that baseline creeps upward the cake is not
releasing -- dust has embedded in the fabric, often from moisture, from a sticky dust, or from operating below the
gas dew point -- and no amount of additional cleaning brings it back. Blinding is irreversible and the bags are
consumed.

Over-cleaning is the opposite error and it is what timer-based cleaning produces. A timer cleans on a schedule
regardless of the pressure, which pulses bags that did not need it: the residual dust cake that does most of the
fine filtration is removed, emissions rise briefly after each pulse, the fabric is flexed more often and fails
sooner, and compressed air -- the most expensive utility in the plant -- is spent for nothing. On-demand cleaning
triggered by differential pressure avoids all four.

The pressure drop range itself is a design and diagnostic band. Too low and the cake is too thin to filter well;
too high and the fan cannot move the design airflow, which shows up as poor hood capture at the source rather than
as a baghouse symptom -- which is the connection back to `dust-collector-air-to-cloth` and to the ventilation the
collector serves.

**Inputs:** the clean-bag baseline pressure drop, the current and trigger differential pressures, the cleaning mode and interval, the compressed air consumption per pulse, the number of pulses per cycle, and the baseline history

**Outputs:** the pressure rise per cycle, the time to reach the trigger, the cleaning frequency, the compressed air consumed per day, the baseline trend against history with a blinding flag, and the airflow the current pressure drop supports

## 3. Worked example

A pulse-jet baghouse with a 2.0 in wc clean-bag baseline and a 6.0 in wc cleaning trigger:

```
healthy cycle: 2.0 -> 6.0 -> pulse -> back to 2.0
```

Over six months the log shows:

```
month 1: baseline 2.0, trigger 6.0, cycle 45 minutes
month 3: baseline 2.6, trigger 6.0, cycle 32 minutes
month 6: baseline 3.9, trigger 6.0, cycle 14 minutes
```

**The baseline is climbing and the cycle is shortening.** The peak has not changed because the trigger sets it;
what has changed is that the bags no longer return to 2.0 after a pulse. That is blinding -- dust embedded in the
fabric that pulsing does not release -- and it is not recoverable. The likely causes are moisture, operation below
the gas dew point, or a change in the dust, and the outcome is a bag change.

Watching the PEAK would have shown nothing wrong for six months.

**Over-cleaning, the other error.** A timer cleaning every 10 minutes on a unit that reaches its trigger in 45
pulses the bags four times more often than needed:

```
compressed air spent      -- four times
bag flex cycles           -- four times, and fabric fails on flex cycles
residual cake removed     -- the layer that does the fine filtration
emissions after each pulse -- a brief spike, four times as often
```

On-demand cleaning triggered by the differential avoids all four, and converting a timer-cleaned unit is usually
the cheapest improvement available to it.

## 4. Scope and non-goals

A trending and diagnostic framework. It does not size a baghouse (`dust-collector-air-to-cloth`), select fabric
or cleaning system, or determine the correct pressure drop range, which depends on the dust, the fabric, and the
cleaning method and comes from the collector manufacturer. It does not diagnose the cause of blinding, which
requires knowing the dust's characteristics, the gas moisture and temperature relative to the dew point, and the
operating history. It does not address emissions performance, which is measured rather than inferred from
pressure, or the bag leak detection that many permits require. It does not address combustible dust hazards
(`dust-deflagration-vent-area`), which apply independently. The collector manufacturer's data, the applicable
permit conditions, and the plant's own baseline history govern.
