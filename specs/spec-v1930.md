# roughlogic.com Specification v1930 -- Headed Bar Development Length (ACI 318-19 25.4.4) (`calc-concrete.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-08. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> ACI 318 reinforced-concrete module `calc-concrete.js`, no new dependency and no network call.
>
> **The gap.** `rc-hook-development` covers standard hooks and its citation said "headed bars are separate". No tile
> computed the headed deformed bar development length, the usual alternative to a hook in congested joints.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive bar,
fy, or f'c; a bar larger than No. 11 (db over 1.41 in); a psi factor outside its table values; or an edition other
than 318-19 / 318-25 returns `{ error }`. Citation: ACI 318-19 25.4.4 by name, GOVERNANCE.general. Aliases:
`headed bar development length`, `headed rebar ldt`, `aci 25.4.4`, `headed deformed bar anchorage`,
`rebar with head development`.

## 2. The tile

### 2.1 `rc-headed-bar-development` -- Headed Bar Development Length (ACI 318-19 25.4.4)

| Quantity | Relation |
|---|---|
| Strength factor | psi_c = f'c/15,000 + 0.6 below 6,000 psi, else 1.0 |
| Development | ldt = max[(fy psi_e psi_p psi_o psi_c / (75 sqrt(f'c))) db^1.5, 8 db, 6 in], sqrt(f'c) <= 100 psi |
| Factors | psi_e 1.0 / 1.2 epoxy; psi_p 1.0 (Att >= 0.3 Ahs or s >= 6 db) / 1.6; psi_o 1.0 (column core, 2.5 in side cover, or side cover >= 6 db) / 1.25 |
| Edition | ACI 318-25 prints 90 in place of 75 |
| Head use (25.4.4.1) | clear cover >= 2 db, spacing >= 3 db, Abrg >= 4 Ab |

## 3. Worked example (registry row)

Dextra's ACI 318-25 headed bar calculation: #8, fy 70,000 psi, f'c 5,800 psi, epoxy coated, psi_p and psi_o 1.0.
Printed ldt 12.092 in; the tile gives 12.092 in the 318-25 mode. No free 318-19 numeric example was found; the 318-19
mode differs only in the coefficient and is pinned by unit test (a #8 at 60 ksi in 4,000 psi concrete: 10.96 in).
