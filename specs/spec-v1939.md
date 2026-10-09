# roughlogic.com Specification v1939 -- Combined Fatigue Loading (Von Mises Alternating and Mean) (`calc-machining.js`, Group K, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group K, the
> fatigue bench in `calc-machining.js`, no new dependency and no network call.
>
> **The gap.** `fatigue-safety-factor` takes one alternating and one mean stress and said multiaxial combination was
> separate. A shaft that bends and twists at once had no way to get those two numbers.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a negative alternating
amplitude, a notch factor below 1, or no stress at all returns `{ error }`. Citation: Shigley Ch. 6, combinations of
loading modes, by name, GOVERNANCE.general. Aliases: `combined loading fatigue`, `von mises alternating stress`,
`bending and torsion fatigue`, `multiaxial fatigue stress`, `shaft fatigue with bending and twisting`.

## 2. The tile

### 2.1 `fatigue-combined-loading`

| Quantity | Relation |
|---|---|
| Alternating | sigma'a = sqrt((Kf_b sa_b + Kf_ax sa_ax/0.85)^2 + 3 (Kfs ta)^2) |
| Mean | sigma'm = sqrt((Kf_b sm_b + Kf_ax sm_ax)^2 + 3 (Kfs tm)^2) |
| Peak | sigma'max from the summed components, for first-cycle yield |

## 3. Worked example (registry row, first principles)

10,000 psi reversed bending, Kf 2; 5,000 psi steady torsion, Kfs 1.5: sigma'a = 20,000 psi, sigma'm = 12,990 psi,
peak 23,848 psi.
