# roughlogic.com Specification v1896 -- Generator-Battery Hybrid Fuel Savings (`calc-reliefpower.js`, Group A Electrical, emergency and temporary power, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefpower.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** A generator carrying a light load around the clock burns fuel inefficiently and wet-stacks. Running it hard for part of the day while a battery carries the rest is the standard fix in temporary power, and the question is always how many hours, how much battery, and how much fuel it saves. Every generator and battery tile in the catalog is single-source.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive load, set point, round-trip efficiency, or cycle count returns `{ error }`; a set point at or below the load, or above the rating, returns `{ error }`; an efficiency above 1.0 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): a first-principles daily energy balance, with fuel read from the manufacturer's four-point fuel curve as in `generator-part-load-fuel` (worked example: Cummins C60D6R data sheet D-6567), the generator and battery manufacturers named as governing, GOVERNANCE.electrical.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`generator battery hybrid`, `generator run hours with battery`, `hybrid power fuel savings`, `battery to reduce generator runtime`, `generator wet stacking battery`.

## 2. The tile

### 2.1 `generator-battery-hybrid-fuel` -- Generator-Battery Hybrid Fuel Savings

```
set point     the generator runs at P_g (for example 3/4 load) while ON,
              serving the load L and charging the battery with P_g - L
balance       (P_g - L) x eta x h = L x (24 - h)
              -> generator hours h = 24 L / (L + (P_g - L) eta)
fuel          hybrid:     h x gph(P_g)
              continuous: 24 x gph(L)
battery       usable kWh per cycle = L x (24 - h) / cycles per day
eta           battery round-trip efficiency
```

The trade is simple to state: run the generator where it is efficient and let the battery cover the rest. During the
ON hours the generator carries the load and charges the battery with its surplus; during the OFF hours the battery
carries the load alone. The energy balance -- surplus stored, less the round-trip loss, equals the energy drawn -- gives
the generator hours directly, and the fuel curve converts the hours to gallons. The same curve gives the gallons for
running continuously at the light load, and the difference is the saving.

The battery is sized per cycle, and the cycle count is the lever. One long OFF period a day needs a battery that
covers most of a day's load; four shorter ones need a quarter of that. More cycles mean more generator starts, which
manufacturers limit, so the tile reports the battery at the entered cycle count rather than picking one.

The fuel saving is often modest, and the tile does not oversell it. The larger benefit is usually mechanical: the
generator never runs in the light-load region where it wet-stacks (`generator-part-load-fuel`), its run hours fall by
more than half, and the site is quiet for most of the day. Those are the reasons temporary-power contractors deploy
hybrids even where the fuel arithmetic alone is close.

**Inputs:** the average load, the generator rating and its four-point fuel curve, the ON set point, the battery round-trip efficiency, and the charge cycles per day

**Outputs:** the generator hours per day, the hybrid and continuous fuel per day, the saving in gallons and percent, the usable battery energy per cycle, and the generator run-hour reduction

## 3. Worked example

A 15 kW average shelter load on a Cummins C60D6R (prime 55 kW; 1.5, 2.5, 3.4, 4.6 gph at 1/4, 1/2, 3/4, full),
running at 3/4 load (41.25 kW, 3.4 gph) when ON, with an 85% round-trip battery:

```
h           24 x 15 / (15 + 26.25 x 0.85) = 9.65 h per day
hybrid      9.65 x 3.4 = 32.8 gal/day
continuous  24 x gph(15 kW) = 24 x 1.591 = 38.2 gal/day
saving      5.4 gal/day (14%)
battery     15 x (24 - 9.65) = 215 kWh at one cycle per day
            = 54 kWh at four cycles per day
```

**A 14% fuel saving and 60% fewer generator hours** -- 9.65 hours a day instead of 24 -- with the generator never
below three-quarters load. Run continuously, the same 15 kW is 25% of the 60 kW standby nameplate -- under the NFPA 110
30% floor that `generator-part-load-fuel` checks.

**The battery is the cost:** 215 kWh if it carries one 14-hour night, 54 kWh if the generator runs four times a day.
At four cycles the saving is the same 5.4 gallons, because the energy balance does not depend on how the OFF hours are
divided; only the battery does.

## 4. Scope and non-goals

A daily energy-balance estimate with a constant average load and a fixed generator set point. It does not model load variation through the day, battery charge acceptance limits, depth-of-discharge and temperature derating of the battery (`off-grid-battery`), inverter losses on the load side, generator start limits, or controller logic. The fuel curve interpolation below 1/4 load is flagged as in `generator-part-load-fuel`. It does not size the inverter or the battery's power rating. The generator, battery, and inverter manufacturers and the AHJ govern.
