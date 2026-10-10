# roughlogic.com Specification v1954 -- Cuttings Slip Velocity (Moore) (`calc-oilgas.js`, Group E, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group E, the
> oil and gas bench in `calc-oilgas.js`, no new dependency and no network call.
>
> **The gap.** `annular-velocity-cleaning` takes the slip velocity as entered and says it "does not compute slip
> velocity"; nothing did.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: a cutting no denser
than the mud, a diameter outside (0, 2] in, a specific gravity outside (1, 6], a flow index outside (0, 1], a hole
not larger than the pipe, or a missing annular velocity in power-law mode returns `{ error }`. Citation: Moore
(1974) as presented in Bourgoyne et al., by name, GOVERNANCE.general. Aliases: `cuttings slip velocity`,
`cuttings transport ratio`, `moore correlation slip velocity`, `hole cleaning slip velocity`,
`how fast do cuttings fall in mud`.

## 2. The tile

### 2.1 `cuttings-slip-velocity`

| Quantity | Relation (field units: ppg, in, cP, ft/s) |
|---|---|
| Apparent viscosity | mu_a = (K/144)((d2 - d1)/v_a)^(1-n)((2 + 1/n)/0.0208)^n, or entered |
| Particle Reynolds number | Re = 928 rho_f v_s d/mu_a |
| Laminar slip, Re under 3 | v_s = 82.87 d^2 (rho_s - rho_f)/mu_a |
| Transitional, 3 to 300 | v_s = 2.90 d (rho_s - rho_f)^0.667/(rho_f^0.333 mu_a^0.333) |
| Turbulent, over 300 | v_s = 1.54 sqrt(d (rho_s - rho_f)/rho_f) |
| Transport ratio | (v_a - v_s)/v_a |

The three forms follow from v^2 = 4 g d (rho_s - rho_f)/(3 f rho_f) with f = 40/Re, 22/sqrt(Re) and 1.5; that
derivation in field units gives 82.91, 2.904, 1.544 and 927.7, and the tile computes with those.

## 3. Worked examples (registry rows)

- 0.25 in cutting (SG 2.6), 9.5 ppg mud, n 0.7, K 200, 8.75 by 5 in annulus at 200 ft/min: 51.2 cP apparent,
  29.3 ft/min slip, Re 21, transport ratio 0.853.
- Laminar: 500 cP, 0.1264 ft/s. Turbulent: 1 cP, 0.8725 ft/s by the published 1.54 form.
