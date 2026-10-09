# roughlogic.com Specification v1940 -- Bare Pipe Heat Loss (Convection and Radiation) (`calc-hvac.js`, Group C, 1 New Tile)

> **Status: LANDED 2026-10-09. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group C, the
> HVAC heat-transfer bench in `calc-hvac.js`, no new dependency and no network call.
>
> **The gap.** `pipe-heat-loss-radial` covers conduction through insulation; nothing gave the heat an uninsulated
> steam or hot-water line loses from its surface, the number behind most "should we insulate this" questions.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a non-positive diameter
or length, emissivity outside (0, 1], a temperature at or below absolute zero, equal surface and air temperatures, or
Ra above 1e12 returns `{ error }`. Citation: Churchill-Chu (1975) and Stefan-Boltzmann by name, GOVERNANCE.general.
Aliases: `bare pipe heat loss`, `uninsulated steam pipe heat loss`, `heat loss from hot pipe to room`,
`natural convection horizontal pipe`, `how much heat does a bare pipe lose`.

## 2. The tile

### 2.1 `bare-pipe-heat-loss`

| Step | Relation |
|---|---|
| Air properties | at Tf = (Ts + Ta)/2: Sutherland mu and k, ideal-gas rho, cp 1,006 J/kg K |
| Convection | Nu = {0.60 + 0.387 Ra^(1/6)/[1 + (0.559/Pr)^(9/16)]^(8/27)}^2, hc = Nu k/D |
| Radiation | hr = eps sigma (Ts^4 - Ta^4)/(Ts - Ta) |
| Loss | q/L = pi D (hc + hr)(Ts - Ta) |

## 3. Worked examples (registry rows)

Engineers Edge, Heat Loss from Bare Steel Pipe to Still Air at 80 F (free): 2 in at 280 F lists 350 BTU/hr-ft
(computed 345.0), 1 in at 180 F lists 82.5 (81.7), 4 in at 380 F lists 1,130 (1,123), all with emissivity 0.8. All nine
table points agree within 1.5%.
