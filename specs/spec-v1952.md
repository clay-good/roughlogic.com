# roughlogic.com Specification v1952 -- Friction (Koepe) Hoist Traction (`calc-mining.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> mining bench in `calc-mining.js`, no new dependency and no network call.
>
> **The gap.** `hoist-rope-safety-factor` checks rope strength and says it "does not evaluate friction hoist
> traction, which is a separate and governing check"; nothing did.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive
conveyance, opposite-side weight or depth, a negative payload or rope weight, a friction coefficient outside (0, 1],
a wrap outside (0, 360], or an acceleration at or above gravity returns `{ error }`. Citation: the capstan relation
by name, first principles, GOVERNANCE.general; no regulatory traction limit is asserted. Aliases:
`friction hoist traction`, `koepe hoist slip`, `hoist rope slip on the drum`, `koepe wheel tension ratio`,
`will my friction hoist ropes slip`.

## 2. The tile

### 2.1 `friction-hoist-traction`

| Quantity | Relation |
|---|---|
| Slip limit | T1/T2 = e^(mu theta) |
| Loaded conveyance at the bottom | T_loaded = conveyance + payload + head rope x depth; T_other = opposite side + tail rope x depth |
| Loaded conveyance at the top | head and tail ropes swap sides |
| Static ratio | larger / smaller, at the worse position |
| Dynamic ratio | T_hi (1 + a/g) / (T_lo (1 - a/g)) |
| Slip acceleration | a/g = (limit x T_lo - T_hi) / (limit x T_lo + T_hi) |

## 3. Worked examples (registry rows, first principles)

- 20,000 lb conveyances, 30,000 lb payload, 24 lb/ft head and tail ropes, 3,000 ft, mu 0.25, 180 degrees: limit
  2.193, static 1.326, 1.599 at 3 ft/s2, slips at 7.93 ft/s2.
- The same hoist with no tail ropes: static ratio 6.10, which slips at rest.
