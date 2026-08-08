# roughlogic.com Specification v1252 -- True Airspeed from CAS and Density Altitude (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v1251.md.
>
> **The gap.** Needed-input none produces: `turn-radius-bank` takes true airspeed as an input, `density-altitude`
> produces DA and stops there, and no tile converts calibrated airspeed to true.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a non-positive CAS, or a density altitude above the troposphere (> 36,089 ft) returns `{ error }`.
Citation discipline (v19/v22): the FAA Pilot's Handbook of Aeronautical Knowledge / ICAO Standard Atmosphere,
`GOVERNANCE.general`. **No table is reproduced.** Companion to `density-altitude` (which supplies the DA input).

## 2. The tile

### 2.1 `true-airspeed` -- True Airspeed from CAS and Density Altitude

```
sigma = (1 - 6.87535e-6 h)^4.2559        h = density altitude in ft (troposphere)
TAS   = CAS / sqrt(sigma)
rule of thumb: TAS ~ CAS (1 + 0.02 h/1000)
```

**Inputs:** calibrated airspeed CAS (kt), density altitude (ft).

**Outputs:** true airspeed (kt), the density ratio sigma, and the rule-of-thumb estimate.

## 3. Worked example

`CAS = 120 kt, density altitude = 8,000 ft`:

```
sigma = (1 - 6.87535e-6 x 8000)^4.2559 = 0.786
TAS   = 120 / sqrt(0.786) = 135.4 KTAS
rule of thumb = 120 (1 + 0.02 x 8) = 139.2 kt
```

Cross-check: at sea-level density altitude sigma = 1 so TAS = CAS = 120 kt; higher DA gives more TAS, below sea level less.

## 4. Scope and non-goals

Treats CAS as equal to equivalent airspeed (the low-speed assumption; the compressibility correction to EAS matters only
at high speed and altitude). TAS is airspeed, not ground speed -- add the wind vector separately. A planning estimate; the
aircraft flight manual and the pilot in command govern. calc-mechanic.js cap raised 72000 -> 76000 B.
