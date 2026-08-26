# roughlogic.com Specification v1356 -- Beverage CO2 Cylinder Duration (calc-kitchen.js, Group O, kitchen and food service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** A bar runs out of CO2 mid-service because nobody converted cylinder pounds into kegs. The catalog has no gas-duration tile for beverage dispense, and the conversion is not obvious: CO2 consumption scales with the volume dispensed and the dispense pressure, not with the number of taps.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive cylinder weight, consumption rate, or throughput, or a reserve fraction outside 0-1, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the beverage-dispense CO2 consumption practice (roughly 1 lb of CO2 per half barrel at typical direct-draw pressures) and the standard cylinder sizes, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `beverage-co2-duration` -- Beverage CO2 Cylinder Duration

```
kegs per cylinder = cylinder weight / pounds of CO2 per keg
days of supply    = kegs per cylinder / kegs dispensed per day
change-out point  = kegs per cylinder x (1 - reserve fraction)
```

CO2 leaves the cylinder two ways: it pushes beer out of the keg, and it stays dissolved in the beer that leaves.
Both scale with volume dispensed, which is why a two-tap bar pouring forty kegs a year and a twelve-tap bar
pouring forty kegs a year use the same gas. Direct-draw systems at 12 to 14 psi run near one pound of CO2 per
half barrel; a long-draw system pushing 30 to 40 psi through a glycol trunk uses considerably more, and blended
gas changes the arithmetic again.

The reserve fraction is the practical output. A cylinder run to empty goes flat mid-pour and the regulator loses
pressure without warning, so the change-out point is set short of the theoretical end.

**Inputs:** cylinder weight (lb of CO2), pounds of CO2 per keg for the system type, kegs dispensed per day,
reserve fraction.

**Outputs:** kegs per cylinder, days of supply, and the change-out point in kegs, with the consumption rate that
produced them.

## 3. Worked example

A 20 lb cylinder, direct-draw system at 1.2 lb CO2 per half barrel, bar pouring 2 kegs/day, 20% reserve:

```
kegs per cylinder = 20 / 1.2        = 16.7 kegs
days of supply    = 16.7 / 2        = 8.3 days
change-out at     = 16.7 x 0.80     = 13.3 kegs (about 6.7 days)
```

So a single 20 lb cylinder is a weekly item and the bar needs a second one on the wall, not a phone call. Push
the same bar to a long-draw system at 1.5 lb per keg and the cylinder drops to 13.3 kegs and 6.7 days -- the
system design, not the volume, moved the delivery schedule.

## 4. Scope and non-goals

Consumption per keg is a system benchmark and varies with dispense pressure, trunk length, carbonation level, and
how much gas is lost to leaks -- a bar whose consumption is far above the benchmark has a leak, and that is the
most useful thing this tile can tell anyone. It does not size the regulator, select between straight CO2 and a
nitrogen blend, or address the confined-space and ventilation requirements that govern where a cylinder or bulk
tank may be located. The gas supplier, the dispense-system manufacturer, and the fire code govern.
