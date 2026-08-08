# roughlogic.com Specification v1248 -- Solar Azimuth Angle (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v1247.md.
>
> **The gap.** Needed-input none produces: `window-overhang-shade` and shadow-direction studies need the solar azimuth,
> `solar-altitude-angle` produces only elevation, and `solar-times` gives neither. This is the azimuth companion.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input, a latitude outside [-90, 90], a day-of-year outside [1, 366], or hours outside [-12, 12] returns
`{ error }`; a below-horizon sun is reported, not errored. Citation discipline (v19/v22): NOAA / Duffie & Beckman solar
geometry with Cooper's declination, `GOVERNANCE.general`. **No table is reproduced.** Inputs mirror
`solar-altitude-angle` exactly so the pair is consistent.

## 2. The tile

### 2.1 `solar-azimuth-angle` -- Solar Azimuth (Sun Compass Bearing)

```
dec = 23.45 sin(360 (284 + n)/365)          Cooper's declination, n = day of year
H   = 15 x (hours from solar noon)          negative in the morning
gamma = atan2(cos(dec) sin(H), cos(H) cos(dec) sin(lat) - sin(dec) cos(lat))   azimuth from south, +west
azimuth (compass, clockwise from north) = (180 + gamma) mod 360
```

**Inputs:** latitude (deg, + north), day of year (1-366), hours from solar noon (- morning, + afternoon).

**Outputs:** azimuth (deg clockwise from true north, with a 16-point compass label), plus the altitude, declination,
and hour angle for reference.

## 3. Worked example

`lat = 40 deg N, day = 172 (summer solstice), hours = -3 (9 a.m.)`:

```
dec = +23.45 deg;  H = -45 deg
gamma = atan2(cos23.45 sin(-45), cos(-45) cos23.45 sin40 - sin23.45 cos40) = -80.2 deg
azimuth = 180 - 80.2 = 99.8 deg  (east of south; altitude 48.8 deg)
```

Cross-check: at solar noon (H = 0) gamma = 0 exactly, so the compass bearing is 180 deg (due south).

## 4. Scope and non-goals

The atan2 form is robust across hemispheres and all hours (azimuth always in [0, 360)). True solar time and a flat
horizon are assumed; the equation of time (from solar-times) and atmospheric refraction are separate. Pair with
`solar-altitude-angle` to place the sun; the shadow falls at bearing +/- 180 deg. calc-solar.js cap raised
34500 -> 37500 B.
