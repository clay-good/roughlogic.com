# roughlogic.com Specification v1944 -- Screen Efficiency (Two-Product Formula) (`calc-mining.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> mining and processing bench in `calc-mining.js`, no new dependency and no network call.
>
> **The gap.** `screen-deck-capacity` said screening efficiency was not computed; it is the number a plant uses to tell
> an overloaded or blinded deck from one that is working.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a percentage outside 0
to 100, a negative feed rate, or assays not ordered oversize < feed < undersize returns `{ error }`. Citation: the
two-product formula (mass balance; Wills) by name, GOVERNANCE.general. Aliases: `screen efficiency`,
`screening efficiency calculation`, `fines carryover screen`, `undersize recovery`, `how well is my screen working`.

## 2. The tile

### 2.1 `screen-efficiency`

| Quantity | Relation |
|---|---|
| Passing split | U/F = (f - o)/(u - o) |
| Fines recovery | u (f - o)/(f (u - o)) |
| Oversize efficiency | (1 - o)(u - f)/((1 - f)(u - o)) |
| Overall | product of the two |

## 3. Worked example (registry row, first principles)

f 40%, o 8%, u 98%: 35.6% of the feed passes (71.1 of 200 st/h), fines recovery 87.1%, oversize efficiency 98.8%,
overall 86.1%.
