# roughlogic.com Specification v1703 -- Pool Heat Pump Capacity vs Air and Water Temperature (`calc-water.js`, Group M Water and Wastewater Operations, pool service, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-water.js`**
> (Group M, Water and Wastewater Operations -- the existing category, hub `/groups/water/`; pool and spa service), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A pool heat pump's rating is stated at one air and water temperature, and its actual capacity falls as the air cools and as the water warms. A unit sized on its nameplate for a shoulder-season pool is undersized exactly when the owner wants to use it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rated capacity, pool volume, or temperature difference, or an air temperature below the unit operating range returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the manufacturer capacity table method and the heat-up relation with the pool heat loss calculation named as governing sizing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pool heat pump capacity air temperature`, `heat pump derate cool weather`, `pool heat up time`, `heat pump cop pool`, `shoulder season pool heating`.

## 2. The tile

### 2.1 `pool-heat-pump-capacity` -- Pool Heat Pump Capacity vs Air and Water Temperature

```
rated capacity     stated at a reference air temperature, humidity, and water temperature
air temperature    capacity falls steeply as air temperature drops; below about 50 degF
                   most air-source pool heat pumps produce little useful output
water temperature  capacity falls as water temperature rises, because the condensing
                   temperature rises with it
humidity           higher humidity raises capacity, because latent heat is available
                   at the evaporator; this is why pool heat pumps like humid climates
COP                falls with the same conditions; a heat pump at 4.0 COP at rating may
                   be at 2.5 in cool weather
heat-up time       t = pool volume x 8.34 x dT / (capacity x efficiency)
```

The three corrections all run the same way in shoulder season: cool air reduces capacity, and the owner
simultaneously wants warmer water, which reduces it again. So a unit that comfortably holds temperature in July
can be barely adequate in May, and one sized on nameplate for a May start date is undersized for the job it was
bought to do.

Humidity working in the unit's favour is the counterintuitive one. A pool heat pump extracts heat from air, and
humid air carries latent heat that condenses on the evaporator and adds to the capacity -- so the same unit
performs better in Florida than in Arizona at the same dry-bulb temperature. It also means capacity data has to
be read at the actual humidity, not just the temperature.

The heat-up time calculation is where owners' expectations break. Raising a large pool by ten degrees is an
enormous quantity of heat, and even a correctly sized heat pump takes days rather than hours -- which is a
different service proposition from a gas heater and has to be explained at the sale rather than discovered. A
cover (`pool-cover-savings`) changes that calculation more than a larger heat pump does, because it stops the
loss the heater is fighting.

**Inputs:** the rated capacity and its rating conditions, the actual air dry bulb and humidity, the actual water temperature, the pool volume, the target temperature rise, and the manufacturer capacity table

**Outputs:** the derated capacity at the entered conditions, the capacity as a percentage of rating, the COP at those conditions, the heat-up time for the entered temperature rise, the heat-up time with a cover in place, and the air temperature at which the unit produces no useful output

## 3. Worked example

A heat pump rated 110,000 BTU/h at 80 degF air, 80 percent humidity, 80 degF water -- which is a summer
condition.

Now the shoulder season the owner actually bought it for: 60 degF air, 60 percent humidity, and they want 85 degF
water.

```
cooler air        -> capacity down
drier air         -> capacity down
warmer water      -> capacity down
```

Manufacturer capacity tables commonly show such a unit at half its rated output or less under those conditions --
so the 110,000 BTU/h unit is delivering perhaps 55,000, and its COP has fallen from 5 or 6 toward 3.

**The heat-up time.** A 20,000 gallon pool raised 10 degF:

```
heat required = 20,000 x 8.34 x 10 = {20000*8.34*10/1e6:.2f} MMBTU
at 55,000 BTU/h = {20000*8.34*10/55000:.0f} hours = {20000*8.34*10/55000/24:.1f} days
```

**{20000*8.34*10/55000/24:.1f} days of continuous running** -- and that is with no losses at all. With an
uncovered pool losing heat to evaporation the whole time, it may never get there.

Which is the real finding: **a cover changes this more than a bigger heat pump does.** From
`pool-cover-savings`, evaporation is the dominant loss, and stopping it lets a modestly sized heat pump actually
gain ground. Selling a larger unit to an uncovered pool is selling capacity to fight a loss that a cover removes.

## 4. Scope and non-goals

A capacity and time estimate using manufacturer data the user supplies. Pool heat pump capacity is a function
of air dry bulb, humidity, and water temperature simultaneously, and manufacturers publish it as a table or a set
of curves -- interpolating from a single rated point will misstate it, often substantially. It does not model the
pool's heat losses, which continue during heat-up and which on an uncovered pool can exceed the heater's output
in cool or windy conditions, so the calculated heat-up time is a floor. It does not size a heater, which requires
a full pool heat loss calculation including evaporation, radiation, convection, and conduction at the design
conditions. It does not address minimum flow requirements, electrical supply, defrost operation in cool weather,
or the equipment clearances an air-source unit requires. The heat pump manufacturer's capacity tables, the pool
heat loss calculation, and the applicable pool and electrical codes govern.
