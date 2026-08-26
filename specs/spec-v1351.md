# roughlogic.com Specification v1351 -- Warewasher Hot-Water Demand and Booster Heater Sizing (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog sizes water heaters, tankless units, and recovery rates, but nothing connects a dish machine's final-rinse flow to the booster heater that has to lift 140 F building water to the 180 F sanitizing rinse. That booster is often the largest single electrical load in a small kitchen and it is routinely undersized.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive rinse flow, rack rate, or efficiency, a final-rinse temperature at or below the supply temperature, or an efficiency outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the FDA Food Code 4-501.112 mechanical-warewashing rinse temperature and the sensible-heat rate 500.4 BTU/hr per gpm per degree F, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `warewasher-hot-water` -- Warewasher Hot-Water Demand and Booster Heater Sizing

```
delta T          = final rinse temp - supply temp
booster BTU/hr   = rinse gpm x delta T x 500.4
booster kW       = booster BTU/hr / 3412
gas input        = booster BTU/hr / thermal efficiency
hourly hot water = racks per hour x gallons per rack
```

A high-temperature dish machine sanitizes with an 180 F final rinse. The building rarely delivers more than 140 F,
so a booster heater makes up the last 40 degrees, and it has to make them up *at the rinse flow rate*, not
averaged over the hour. The constant 500.4 is 8.34 lb/gal x 60 min/hr: one gpm raised one degree F is 500.4 BTU/hr.

The second output is the one that sizes the building water heater rather than the booster: racks per hour times
gallons per rack is the total hot water the machine pulls, and that number lands on the 140 F system upstream.
A machine can be perfectly boosted and still run cold because the building heater cannot keep up with the volume.

**Inputs:** final-rinse flow (gpm), supply water temperature (F), final-rinse temperature (F), racks per hour,
gallons per rack, booster thermal efficiency (for the gas figure).

**Outputs:** booster load in BTU/hr and kW, required gas input at the stated efficiency, and hourly hot-water
demand on the building system, with the temperature rise that produced them.

## 3. Worked example

A door-type machine with a 1.16 gpm final rinse, 140 F supply, 180 F rinse, 40 racks/hour at 1.2 gal/rack, gas
booster at 80% thermal efficiency:

```
delta T      = 180 - 140                = 40 F
booster      = 1.16 x 40 x 500.4        = 23,219 BTU/hr = 6.8 kW
gas input    = 23,219 / 0.80            = 29,023 BTU/hr
hourly water = 40 x 1.2                 = 48 gal/hr at 140 F
```

So a 9 kW electric booster covers it with margin and a 7 kW does not, once connection losses are counted.
Check the supply sensitivity: if the building actually delivers 120 F rather than 140 F, the rise goes to 60 F and
the booster load to 34,828 BTU/hr (10.2 kW) -- the same machine, a different building.

## 4. Scope and non-goals

High-temperature sanitizing only. A low-temperature chemical-sanitizing machine has no booster and is governed by
its sanitizer concentration instead (the catalog's 3-compartment sink sanitizer tile covers that chemistry). The
tile does not size the drain, the vent, or the electrical branch circuit, and it assumes the rinse runs at the
manufacturer's rated flow with a working pressure-regulating valve. A planning aid; the machine data plate, the
FDA Food Code as adopted by the state, and the health inspector govern.
