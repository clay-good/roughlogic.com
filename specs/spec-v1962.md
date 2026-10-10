# roughlogic.com Specification v1962 -- Belt Feeder Load, Pull and Power (`calc-mining.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> mineral processing bench in `calc-mining.js`, no new dependency and no network call.
>
> **The gap.** `belt-feeder-capacity` meters the tonnage and said it "does not compute the belt pull or drive power
> a feeder requires"; nothing did.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a slot width outside
(0, 240] in, a slot length outside (0, 200] ft, a bulk density outside (0, 500] lb/cu ft, a friction angle outside
15 to 70 degrees, a flow surcharge factor outside (0, 50], an initial factor below the flow factor, a belt speed
outside (0, 1,000] fpm, a negative resistance, or an efficiency outside (0, 1] returns `{ error }`. The surcharge
factors are entered; the tile does not compute them. Citation: Roberts and Manjunath (1986), by name,
GOVERNANCE.general. Aliases: `belt feeder power`, `belt feeder pull`, `feeder load from hopper`,
`hopper surcharge factor`, `belt feeder drive sizing`, `how much power does a belt feeder need`.

## 2. The tile

### 2.1 `belt-feeder-pull`

Each quantity is computed twice, with the initial and the flow surcharge factor.

| Quantity | Relation |
|---|---|
| Feeder load, lb | q x bulk density x L x B^2 (ft) |
| Shear coefficient | 0.8 sin(effective angle of internal friction) |
| Pull to shear, lb | coefficient x load |
| Shear power, hp | pull x fpm / 33,000 |
| Drive power, hp | (pull + other resistances) x fpm / 33,000 / efficiency |

## 3. Worked examples (registry rows)

- A 36 in by 12 ft slot, 100 lb/cu ft, 45 degrees, q 2.5 and 1.0, 60 fpm: 27,000 and 10,800 lb of load, 15,274 and
  6,109 lb of pull, 30.9 and 12.3 hp at 90%.
- Roberts and Manjunath section 12.2, converted: 265.89 / 109.84 kN, 162.94 / 67.31 kN, 81.47 / 33.66 kW,
  127.63 / 81.61 kW.
