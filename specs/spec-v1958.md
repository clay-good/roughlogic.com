# roughlogic.com Specification v1958 -- Free Surface Moment of a Slack Tank (`calc-marineaviation.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> marine bench in `calc-marineaviation.js`, no new dependency and no network call.
>
> **The gap.** `metacentric-height` takes the free surface moment as entered and said it "does not compute the
> free surface moment, which needs each tank's geometry"; nothing did.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a length outside
(0, 1,000] ft, a breadth outside (0, 300] ft, a density outside (0, 1,000] lb/cu ft, a compartment count that is
not a whole number from 1 to 20, a tank count that is not a whole number from 1 to 100, or a negative displacement
returns `{ error }`. The output key `free_surface_moment_ftlb` is the input key `metacentric-height` reads.
Citation: the free surface correction as Principles of Naval Architecture and standard stability texts state it,
by name, GOVERNANCE.general. Aliases: `free surface effect`, `free surface moment`, `free surface correction`,
`slack tank stability`, `virtual rise of g`, `how much gm does a slack tank cost`.

## 2. The tile

### 2.1 `free-surface-moment`

| Quantity | Relation |
|---|---|
| Surface second moment of area, ft^4 | tanks x l b^3 / (12 n^2), n = equal compartments across |
| Free surface moment, ft-lb | liquid density x that |
| Loss of metacentric height, ft | moment / displacement |
| With one more division | moment x n^2 / (n + 1)^2 |

## 3. Worked examples (registry rows)

- A 10 by 8 ft seawater tank in a 60,000 lb vessel: 426.67 ft^4, 27,306.7 ft-lb, 0.4551 ft; split once, 6,826.7.
- Two 12 by 9 ft diesel tanks, three compartments across: 8,586 ft-lb against 77,274 undivided.
