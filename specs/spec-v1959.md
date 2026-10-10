# roughlogic.com Specification v1959 -- Saturated Steam Properties (`calc-steamplant.js`, Group C, 1 New Tile)

> **Status: LANDED 2026-10-10. Single-tile spec.** In scope under the spec-v106 trades-only charter: Group C, the
> steam plant bench in `calc-steamplant.js`, no new dependency and no network call.
>
> **The gap.** `steam-pipe-velocity`, `steam-pipe-capacity`, `condensate-return-sizing`, `flash-steam-pct`,
> `steam-trap-sizing`, `steam-kettle-heatup` and `deaerator-steam-demand` each take a specific volume, a latent
> heat or an enthalpy "from the steam tables". No tile returned one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dimensional lint, bounds fuzzer, worked-example registry, and the v18/v21 contract apply: an atmosphere
outside 8 to 16 psia, or an absolute pressure below 0.1 or above 2,300 psia, returns `{ error }`. Gauge pressure
may be negative (vacuum). The output key `spec_vol_ft3lb` is the input key the three pipe-sizing tiles read.
Citation: IAPWS R7-97(2012), GOVERNANCE.general. Aliases: `steam table`, `saturated steam table`,
`steam properties by pressure`, `steam specific volume`, `latent heat of steam`, `steam temperature at pressure`,
`hfg steam`, `boiling point of water at pressure`, `what temperature is steam at 100 psi`.

## 2. The tile

### 2.1 `saturated-steam-properties`

| Quantity | Source |
|---|---|
| Saturation temperature | IAPWS-IF97 Eq. 31 (Table 34 coefficients) |
| Saturated liquid vf, hf | Region 1, Eq. 7 (Table 2), at the saturation temperature and pressure |
| Saturated vapor vg, hg | Region 2, Eq. 15 (Tables 10 and 11), at the same point |
| Latent heat hfg | hg - hf |

The four IF97 equations are exported together as `IF97` so a test can hold them to the release's verification tables.

## 3. Worked examples (registry rows)

- IAPWS Table 36: 1 MPa gives 453.035632 K (355.794 F); 0.1 MPa gives 372.755919 K (211.291 F).
- 100 psig at sea level: 337.88 F, 3.892 cu ft/lb, hf 309.1, hfg 880.9, hg 1,190.0 Btu/lb.
