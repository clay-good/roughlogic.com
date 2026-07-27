# roughlogic.com Specification v1033 -- Compressed-Air Pipe Pressure Drop (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`**
> (Group C), no new module, group, or dependency. Inherits spec.md through spec-v1032.md.
>
> **The gap, and the evidence for it.** The compressed-air bench is energy and volume only:
> `compressed-air-power`, `air-leak-cost`, `air-receiver`, `air-pressure-setpoint-savings`,
> `air-density-correction`. Nothing computes distribution pressure drop. The fuel-gas tiles
> (`gas-pipe-pressure-drop`) are a different regime with different tables, and `pipe-velocity` is liquid.
> Discovery batch 4: "Genuinely open."

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
flow / diameter / length / pressure / roughness, or a temperature at or below absolute zero, return
`{ error }`. Citation discipline: **no empirical compressed-air constant is used.** Renderer:
hand-written non-exported (module convention).

## 2. The tile

### 2.1 `compressed-air-pressure-drop` -- Compressed-Air Pipe Pressure Drop

```
inputs:  scfm, pipe_id_in (ACTUAL inside diameter), length_ft (incl. fitting equivalent lengths),
         line_pressure_psig (100), air_temp_f (68), roughness_ft (0.00015 commercial steel)
compute: P_abs = psig + 14.7;  T_R = F + 459.67
         rho   = P_abs x 144 / (R_air x T_R)        ideal gas law, R_air = 53.35 ft-lbf/lb-R
         Q_act = scfm x (14.7/P_abs) x (T_R/527.67) same gas law, standard -> actual volume
         V     = Q_act / 60 / A
         Re    = rho V D / mu
         f     = colebrookFrictionFactor (the repo's own verified solver)
         dP    = f (L/D) rho V^2 / (2 gc) / 144     psi
outputs: p_abs_psia, density_lb_ft3, actual_cfm, velocity_fps, reynolds, friction_factor,
         pressure_drop_psi, drop_per_100ft_psi, pct_of_line, over_10pct, note
```

**Everything is derived, nothing is recalled.** The friction factor comes from `colebrookFrictionFactor`
in pure-math.js -- already landed, already fuzzed, already used by the duct tiles -- so this tile adds no
new hydraulic model. Density and the standard-to-actual conversion are both the ideal gas law. The one
physical property, air dynamic viscosity, is written as `1.81e-5 * 0.67197` -- the SI value at 68 F
(web-verified 2026-07-27) times the exact Pa-s to lb/(ft-s) conversion -- rather than a recalled imperial
number, so the source of every digit is visible in the code.

**The trap the tile exists to show.** Standard cubic feet are a MASS measure. At 100 psig, 100 scfm is
only **12.8 actual cfm**, so sizing a line off the scfm figure directly overstates the velocity by nearly
8x. The renderer reports actual cfm and density next to the velocity for exactly this reason.

**Worked example (pinned).** 100 scfm, 1.049-in ID (1-in schedule 40), 100 ft, 100 psig, 68 F, steel:
rho 0.5867 lb/ft^3, 12.82 actual cfm, 35.59 ft/s, Re 150,079, f 0.023779, **2.18 psi** (2.2% of line).
Cross-check against published shop-air practice: 200 scfm through 2-in schedule 40 (2.067 in) over 500 ft
at 100 psig gives 1.29 psi, i.e. about 0.26 psi per 100 ft -- matching the ~0.25 psi/100 ft that
compressed-air sizing tables give for that case.

## 3. Scope limits

Isothermal single-phase flow at the entered temperature, using the INLET density throughout -- conservative,
since density rises as pressure falls along the run. Fitting equivalent lengths are the user's to add and
often dominate a shop drop. Receiver sizing, leak cost, and compression power are separate tiles.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins the worked example, the published-table
cross-check, the exact gas-law identities (actual cfm and density both scale exactly with the absolute
pressure ratio), the scfm-vs-actual factor, laminar/turbulent regime behavior, monotonicity in flow and
length, exact linearity in length, and error seams.
