# roughlogic.com Specification v1932 -- Nail Lateral Design Value (NDS Yield Limit, Face- or Toe-Nailed) (`calc-construction.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-08. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> NDS wood bench in `calc-construction.js`, no new dependency and no network call.
>
> **The gap.** The nail, lag, and wood-screw withdrawal tiles cover pulling a fastener out, and
> `wood-bolt-connection` covers lateral load on bolts from 1/4 in up. Nothing gave a nail's lateral value Z,
> the number behind almost every nailed connection a framer or deck builder checks.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a diameter of zero or
1/4 in and over, a non-positive length or side thickness, a specific gravity outside (0, 1), a penetration under 6 D,
or a non-positive CD returns `{ error }`. Citation: NDS 2018 12.3.1 / 12.5.4 by name, worked as AWC Design Aid No. 2
(free), GOVERNANCE.general. Aliases: `nail lateral design value`, `toenail lateral capacity`, `16d nail shear capacity`,
`nail yield limit z`, `how much load does a nail hold sideways`.

## 2. The tile

### 2.1 `wood-nail-lateral` -- Nail Lateral Design Value (NDS Yield Limit, Face- or Toe-Nailed)

| Quantity | Relation |
|---|---|
| Bearing | Fe = 16,600 G^1.84 for each member; Re = Fem/Fes; Rt = p/ls |
| Reduction | Rd = KD = 2.2 for D <= 0.17 in, 10 D + 0.5 to 0.25 in |
| Modes | Im, Is, II, IIIm, IIIs, IV per NDS 12.3.1; Z = least |
| Fyb | 100,000 / 90,000 / 80,000 / 70,000 psi by diameter (Appendix I) unless entered |
| Toe-nail | ls = L/3, p = L cos 30 - L/3, Ctn = 0.83 |

## 3. Worked examples (registry rows)

AWC Design Aid No. 2: a 16d common (0.162 x 3.5 in) toe-nailed at G 0.50 lists 117 lb; this gives 116.8 (mode IV).
An 8d common (0.131 x 2.5 in) lists 80 lb; this gives 79.6. All nine species columns of the 16d row agree within 1 lb.
