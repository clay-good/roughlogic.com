# roughlogic.com Specification v1938 -- Cumulative Fatigue Damage (Miner's Rule) (`calc-machining.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> fatigue bench in `calc-machining.js`, no new dependency and no network call.
>
> **The gap.** `fatigue-finite-life` gives the life at one reversed stress; a real duty cycle has several. Nothing
> summed the damage.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: negative entries, a
block with a stress but no cycles (or the reverse), no block at all, a block above f Sut, or any S-N line error from
`fatigue-finite-life` returns `{ error }`. Citation: Palmgren-Miner via Shigley Sec. 6-15 by name,
GOVERNANCE.general. Aliases: `miners rule`, `palmgren miner`, `cumulative fatigue damage`,
`variable amplitude fatigue life`, `how long will a part last with different loads`.

## 2. The tile

### 2.1 `fatigue-miner-damage` -- Cumulative Fatigue Damage (Miner's Rule)

| Quantity | Relation |
|---|---|
| Life per block | N_i = (sigma_i/a)^(1/b) on the `fatigue-finite-life` line; no damage at or below Se |
| Damage per block | D = sum(n_i/N_i) over up to three blocks |
| To failure | blocks = 1/D; cycles = (1/D) sum(n_i) |

## 3. Worked example (registry row, first principles)

Sut 100 kpsi, Se 50 kpsi, f 0.9 (a = 162 kpsi, b = -0.08509); 20% of cycles at 70 kpsi (N = 19,173), 50% at 55 kpsi
(N = 326,247), 30% at 40 kpsi (below Se). Cycles to failure = 1/(0.2/19,173 + 0.5/326,247) = 83,583.
