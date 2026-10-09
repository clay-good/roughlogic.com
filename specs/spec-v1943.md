# roughlogic.com Specification v1943 -- Grinding Circuit Circulating Load (Two-Product Formula) (`calc-mining.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> mining and processing bench in `calc-mining.js`, no new dependency and no network call.
>
> **The gap.** `screen-deck-capacity` said the recirculating load of a closed circuit was not computed; it changes the
> tonnage every classifier and mill in the loop sees.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a percentage outside 0
to 100, a negative feed rate, or a feed fraction not strictly between the two product fractions returns `{ error }`.
Citation: the two-product formula (mass balance; Wills) by name, GOVERNANCE.general. Aliases: `circulating load`,
`cyclone circulating load`, `two product formula`, `recirculating load ball mill`, `how much goes back to the mill`.

## 2. The tile

### 2.1 `circulating-load-ratio`

| Quantity | Relation |
|---|---|
| Ratio | U/O = (o - f)/(f - u) on one size class |
| Tonnage | underflow = ratio x new feed; classifier feed = new feed + underflow |

## 3. Worked example (registry row, first principles)

40 / 70 / 25 % passing 75 microns: 200% circulating load; 100 st/h new feed -> 200 st/h underflow, 300 st/h to the
cyclones, and the size-class balance closes (120 = 70 + 50).
