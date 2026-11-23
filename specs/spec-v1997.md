# roughlogic.com Specification v1997 -- Appliance Electricity Use and Cost (`calc-electricalanalysis.js`, Group A Electrical, 1 New Tile)

> **Status: LANDED 2026-11-23 (proposed 2026-11-23). Single-tile spec.** In scope under the spec-v106 trades-only
> charter: Group A, beside `motor-operating-cost` and `ev-charge-cost`, no new dependency.
>
> **The gap.** "Electricity cost 1500 watts 8 hours a day 15 cents per kwh" reached the EV charge-cost tile and put
> 1500 into its rate. Every electricity-cost tile in the catalog is specialized (a motor by horsepower, one EV charge,
> a VFD retrofit, a battery's arbitrage); none takes a plain load in watts and its hours.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. The tile: `appliance-energy-cost`

```
kWh/day  = watts x hours per day / 1,000
kWh/year = kWh/day x days used per year (365 default)
cost     = kWh x rate (cents per kWh) / 100; per month = per year / 12
watts    = amps x volts (120 V default) when no wattage is entered
```

Refused: both watts and amps, neither, power not in (0, 1,000,000] W, hours not in (0, 24], days not 1-366,
a rate outside 1-200 cents per kWh (a dollar rate like 0.15 is refused with "15 for $0.15", not read as cents),
volts not in (0, 600] with amps.

## 2. Worked examples (Virginia Cooperative Extension 2901-9014)

Window fan: 200 W x 4 h x 120 days / 1,000 = 96 kWh; x 8.5 cents = $8.16 a year. Computer and monitor: (120 + 150) W
x 4 h x 365 days / 1,000 = 394.2 kWh; x 8.5 cents = $33.51 a year. Cross-check: 1,500 W, 8 h a day, 15 cents =
$1.80 a day, $657 a year.

## 3. Scope

Label wattage is the maximum; cycling loads need their running hours. Motors by horsepower and efficiency are
`motor-operating-cost`; EV charging is `ev-charge-cost`.
