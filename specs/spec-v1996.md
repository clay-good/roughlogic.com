# roughlogic.com Specification v1996 -- Sensible Heat of an Airstream (`calc-hvacairside.js`, Group C HVAC, 1 New Tile)

> **Status: LANDED 2026-11-16 (proposed 2026-11-16). Single-tile spec.** In scope under the spec-v106 trades-only
> charter: Group C, beside `cooling-coil-total-load` (4.5 x CFM x dh) and `furnace-airflow-to-rise`, no new dependency.
>
> **The gap.** Q = 1.08 x CFM x dT is the most used equation in air-side HVAC, and the catalog had it only inside
> tiles that wrap it in something else (furnace rise against a rating plate, makeup-air tempering, the SHR split,
> VAV box limits). "Btu per hour 400 cfm 20 degree delta t" reached the pool heater.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. The tile: `sensible-heat-airflow`

```
Q (Btu/h) = factor x CFM x dT (F); factor = 1.08 for standard air
          = 60 min/h x 0.075 lb/cu ft x 0.24 Btu/lb-F
solve     enter two of Q, CFM, dT; the blank one is solved (the ohms-law pattern)
tons      |Q| / 12,000 (sensible)
```

The factor is an input (default 1.08) so altitude-corrected air can be entered as 1.08 x the density ratio.
Refused: not exactly two of the three, CFM not positive, a zero dT or Q, Q and dT of opposite sign when solving CFM,
a factor outside (0, 1.2], CFM over 1,000,000, |dT| over 500 F.

## 2. Worked examples (first principles)

400 CFM at a 20 F difference: 1.08 x 400 x 20 = 8,640 Btu/h (0.72 sensible tons). 36,000 Btu/h at 20 F: 36,000 /
(1.08 x 20) = 1,667 CFM. 8,640 Btu/h through 400 CFM: 20 F.

## 3. Scope

Sensible only. Latent (0.68 x CFM x d-grains) and total (4.5 x CFM x dh) are `shr-latent` and
`cooling-coil-total-load`; altitude air density is `air-density-correction`.
