# roughlogic.com Specification v1213 -- Solar Altitude / Winter-Design Sun Elevation (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v1212.md.
>
> **The gap, and the evidence for it.** The `shadow-length` tile takes `sun_altitude_deg` and `pv-row-spacing` takes
> `profile_angle_deg`, and both notes point at a source that does not exist: "the winter-design sun elevation ... from
> the site latitude, or from solar-times." But `computeSolarTimes` (calc-field.js) returns only sunrise/sunset/twilight
> and declination -- never the altitude. This computes the altitude those tiles need.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a latitude outside -90..90, a day-of-year outside 1..366, or hours outside
-12..12 returns `{ error }`; a sun below the horizon returns a negative altitude with a flag (not an error). Citation
discipline (v19/v22): the NOAA/ASHRAE solar-geometry relation with Cooper's declination, by name, `GOVERNANCE.general`.
**No copyrighted table is reproduced** -- the solar-position equations are public-domain geometry.

## 2. The tile

### 2.1 `solar-altitude-angle` -- Solar Altitude / Winter-Design Sun Elevation

```
dec  = 23.45 sin(360 (284 + n)/365)                   Cooper's declination (n = day of year)
H    = 15 (hours from solar noon)                      hour angle (deg; - morning, + afternoon)
sin(altitude) = sin(lat) sin(dec) + cos(lat) cos(dec) cos(H)
at solar noon (H = 0): altitude = 90 - |lat - dec|
```

**Inputs:** latitude (deg, + north), day of year (1-365; 355 = winter solstice), hours from solar noon.

**Outputs:** `altitude_deg`, the declination, and the hour angle; a below-horizon flag.

## 3. Worked example

`latitude_deg = 40, day_of_year = 355, hours_from_solar_noon = 0`:

```
dec = 23.45 sin(360 (284 + 355)/365) = -23.45 deg
altitude = 90 - |40 - (-23.45)| = 90 - 63.45 = 26.6 deg
```

The winter noon sun at 40 deg N reaches only 26.6 deg. By 3 p.m. (H = 45 deg) it drops to sin(alt) = sin40 sin(-23.45)
+ cos40 cos(-23.45) cos45 = 0.241, altitude 14.0 deg -- the low sun that governs PV inter-row spacing. The summer
solstice (n = 172) noon sun is 73.4 deg.

## 4. Limitations

True solar time and a flat horizon are assumed. The equation of time (available from `solar-times`), atmospheric
refraction near the horizon, and terrain are separate corrections. A site-planning geometry, not a full sun-path shading
study; the actual sun path governs.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1213` pins the solar-noon reduction (90 - |lat - dec|), the 3 p.m. hour-angle value, the
  summer/winter extremes, the below-horizon flag, and the error seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the winter-noon example and the 3 p.m. cross-check).
- Formula checked against the standard NOAA/ASHRAE solar-position relation and Cooper's declination equation.
