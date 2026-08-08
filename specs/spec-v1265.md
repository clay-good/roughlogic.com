# roughlogic.com Specification v1265 -- Reference Evapotranspiration ET0 (calc-agriculture.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`**
> (Group L), no new module or dependency. Inherits spec.md through spec-v1264.md.
>
> **The gap (needed-input).** The irrigation tiles (`irrigation-requirement`, `mad-irrigation-trigger`) CONSUME a
> reference ET (ET0) but none computes it -- the crop-Kc table note says ET0 "is user-supplied from the local
> CIMIS / Mesonet / NOAA station." This fills that gap.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a latitude beyond the polar circles (|lat| > 66.5), a daily high below the daily low, or a bad month returns
`{ error }`. Citation discipline (v19/v22): Hargreaves & Samani (1985) as presented in FAO Irrigation & Drainage
Paper 56, Annex 2 for the extraterrestrial-radiation equations; `GOVERNANCE.general`. Fully first-principles /
public-domain; the extraterrestrial radiation Ra is **verified against FAO-56 Annex 2 Table 2.6**.

## 2. The tile

### 2.1 `reference-et0` -- Reference Evapotranspiration ET0 (Hargreaves / FAO-56)

```
Hargreaves:  ET0 = 0.0023 (Tmean + 17.8) sqrt(Tmax - Tmin) Ra     (Ra as mm/day = Ra_MJ / 2.45)
Ra (FAO-56 Annex 2, from latitude phi and day of year J):
  dr  = 1 + 0.033 cos(2pi J/365)
  dec = 0.409 sin(2pi J/365 - 1.39)
  ws  = arccos(-tan(phi) tan(dec))
  Ra  = (24*60/pi) 0.0820 dr [ ws sin(phi) sin(dec) + cos(phi) cos(dec) sin(ws) ]   MJ/m^2/day
J = mid-month day = floor(30.4 M - 15); temperatures converted F -> C.
```

**Inputs:** latitude (deg, + north / - south), month, daily high Tmax (F), daily low Tmin (F).

**Outputs:** ET0 (in/day and mm/day), extraterrestrial radiation Ra (MJ/m^2/day), mid-month day of year, mean temp.

## 3. Worked example

45 deg N, July, 86/59 F (= 30/15 C):

```
J = 197;  Ra = 40.49 MJ/m^2/day  (FAO-56 Table 2.6 at 45 N ~ 40.5)
ET0 = 0.0023 x (40.49/2.45) x (22.5 + 17.8) x sqrt(15) = 5.93 mm/day = 0.234 in/day
```

Second check, 33 deg N, April, 90/60 F: Ra = 36.46 MJ/m^2/day, ET0 = 5.83 mm/day (0.229 in/day).

## 4. Scope and non-goals

The temperature-only Hargreaves estimate; where full climate data (humidity, wind, solar) exist the FAO-56
Penman-Monteith method is more accurate and a local weather-station ET0 (CIMIS, Mesonet) governs. Uses one
representative mid-month day rather than a specific date. Latitudes beyond the polar circles are out of range. A
planning aid; the local station and the agronomist govern.
