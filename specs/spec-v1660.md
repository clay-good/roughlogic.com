# roughlogic.com Specification v1660 -- Paint Booth Airflow, Air Changes, and Cure Time (`calc-mechanic.js`, Group K Mechanic - Auto, Marine, Aviation, auto body, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`**
> (Group K, Mechanic - Auto, Marine, Aviation -- the existing category, hub `/groups/mechanic/`; auto body and refinishing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A spray booth's airflow is set by a face velocity that keeps overspray moving away from the painter, and its cure cycle by the coating's schedule at temperature. Both are code and manufacturer numbers, and a booth running below its design velocity is a fire and health problem before it is a quality one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive booth dimension, face velocity, or cure temperature, or a cure time at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the face velocity and bake energy relations with NFPA 33 and the booth listing named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`paint booth airflow`, `booth face velocity`, `spray booth air changes`, `bake cycle energy`, `booth filter loading velocity`.

## 2. The tile

### 2.1 `paint-booth-airflow-cure` -- Paint Booth Airflow, Air Changes, and Cure Time

```
face velocity     downdraft booths commonly 50 to 100 fpm through the working area;
                  crossdraft similar through the booth cross-section
airflow           CFM = cross-sectional area x face velocity
air changes       ACH = CFM x 60 / booth volume -- a large number for a booth
cure              time at temperature from the coating's technical data sheet;
                  cure time roughly halves for each 15 to 20 degF rise, within limits
bake energy       heating the booth's full airflow to bake temperature, continuously
filter loading    velocity falls as filters load; the booth must be monitored, not assumed
```

Face velocity is a health and fire requirement first. It is what carries atomized coating and solvent vapour
away from the painter's breathing zone and keeps the booth's interior below the lower flammable limit, and the
minimum is set by code and by the booth's listing rather than by finish quality. A booth running below it because
its filters are loaded is out of compliance, and the symptom a shop notices -- dirt in the finish -- is the least
of what is wrong.

The bake energy is large and it surprises people. A booth heats its entire airflow from ambient to bake
temperature and exhausts it, continuously, so the energy is the full airflow times the temperature rise for the
whole cycle -- not the energy to heat a car. That is why bake cycles are short, why heat recovery and recirculation
appear on newer booths, and why the cure schedule's time-at-temperature is worth getting right rather than
padding.

Cure follows the coating's own schedule and the temperature that matters is the METAL temperature, not the air.
A panel takes time to come up to bake temperature, and a cycle timed from when the booth's air reaches setpoint
under-cures the coating -- which is why booth cure cycles specify a ramp plus a hold rather than a single
duration.

**Inputs:** booth interior dimensions, the required face velocity, the measured velocity, the coating cure schedule time and temperature, the ramp time, the ambient temperature, and the fuel cost

**Outputs:** the booth cross-sectional area, the airflow at the required and measured face velocities, the air changes per hour, the bake energy for the entered cycle, the fuel cost per cycle, and a flag where the measured velocity falls below the requirement

## 3. Worked example

A downdraft booth 24 ft long, 14 ft wide, 10 ft high, at a 100 fpm face velocity through the
working area:

```
plan area = 24 x 14 = 336 sq ft
airflow   = 336 x 100 = 33,600 cfm
volume    = 3,360 cu ft
air changes = 33,600 x 60 / 3,360 = 600 ACH
```

**600 air changes an hour** -- which is what a booth is, and why it is one of the largest air
handlers in most shops.

The bake energy, heating that airflow from 70 degF ambient to a 140 degF bake:

```
Q = 1.08 x 33,600 x 70 = 2.54 MMBTU/h
over a 30 minute bake         = 1.27 MMBTU per cycle
at $9/MMBTU                   = $11.43 per bake
```

Modest per cycle, and at eight bakes a day, 250 days, it is
$22,861 a year -- which is what recirculating bake booths are sold against.

The filter check: if the measured velocity has fallen to 65 fpm as filters loaded, the booth is moving
`21,840` cfm, 35% below its design, and it is out of compliance on the requirement that
protects the painter -- not merely producing a dirtier finish.

## 4. Scope and non-goals

A screening calculation. Booth face velocity requirements, booth construction, electrical classification,
interlocks between the spray equipment and the ventilation, and the fire protection a booth requires are set by
NFPA 33, the adopted fire and mechanical codes, and the booth's listing, and those govern rather than any
calculation. It does not address filter selection or the differential pressure monitoring that a booth must have
to know its velocity is being maintained. Cure schedules are coating-specific and are stated as metal temperature
and time; the booth's air temperature and the ramp to metal temperature are not the same thing, and infrared and
convection cures behave differently. It does not address the respiratory protection, isocyanate exposure controls,
or the air quality permitting that spray finishing requires. NFPA 33, the adopted codes, the booth manufacturer's
listing, the coating manufacturer's cure schedule, OSHA, and the air quality authority govern.
