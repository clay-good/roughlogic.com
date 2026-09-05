# roughlogic.com Specification v1474 -- Vibration Severity Zone (ISO 20816) (`calc-millwright.js`, Group S, millwrighting, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-millwright.js`**
> (Group S, millwright, rotating equipment, and pneumatics), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** An overall vibration reading in inches per second means nothing without a class, and the class depends on machine size and mounting. ISO 20816 puts the reading in a lettered zone that says plainly whether to run it, watch it, or shut it down, and that lookup plus the trend arithmetic is nowhere in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a negative velocity reading, or a class selection outside the four defined classes returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): ISO 20816 zone boundaries by name with the mm/s to in/s conversion, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`iso 20816 vibration`, `vibration severity zone`, `overall vibration limit`, `vibration zone abcd`, `machine vibration acceptable`.

## 2. The tile

### 2.1 `vibration-severity-zone` -- Vibration Severity Zone (ISO 20816)

```
overall velocity   v_rms, 10 to 1,000 Hz band
zone A             new machine condition
zone B             acceptable for unrestricted long-term operation
zone C             unsatisfactory for long-term; plan corrective action
zone D             severe; damage may be occurring
conversion         1 mm/s = 0.03937 in/s
```

The standard splits machines into classes by power and mounting because the same absolute velocity means
different things on a 10 hp pump and a 2,000 hp compressor on a soft foundation. Within a class the three zone
boundaries are fixed velocities, so the reading and the class together give the answer with no judgment
required -- which is exactly what makes it useful to a technician who is not a vibration analyst.

The zone is a screen, not a diagnosis. A reading in zone C says something is wrong and says nothing about what;
`vibration-forcing-frequencies` and `bearing-defect-frequencies` are what turn an overall level into a cause.
Equally important is the CHANGE: a machine that has doubled from 0.06 to 0.12 in/s is telling a clear story even
though both readings sit in zone B, and the standard's own guidance treats a significant change as actionable
regardless of zone.

**Inputs:** overall vibration velocity with its unit, the machine class, and optionally a previous reading and the elapsed interval for a trend

**Outputs:** the reading converted to both in/s and mm/s, the zone letter, the boundaries for that class, the margin to the next zone, and the percent change and rate from a previous reading where one is entered

## 3. Worked example

Zone boundaries in in/s rms (converted from the standard's mm/s values):

```
Class I (small, up to 20 hp)           A/B 0.028   B/C 0.071   C/D 0.177
Class II (medium, 20 to 100 hp)        A/B 0.044   B/C 0.110   C/D 0.280
Class III (large, rigid mount)         A/B 0.071   B/C 0.177   C/D 0.441
Class IV (large, flexible mount)       A/B 0.110   B/C 0.280   C/D 0.709
```

A 60 hp pump (Class II) reading 0.135 in/s sits in **zone C** -- above the 0.110 B/C boundary, below the 0.280
C/D. Unsatisfactory for long-term operation: plan the work, do not necessarily shut down.

Now the trend. If that machine read 0.062 in/s six months ago it has grown 118% and crossed a zone
boundary in one interval. That rate matters more than the absolute number, and it is what turns a scheduled
inspection into a planned outage before it becomes an unplanned one.

## 4. Scope and non-goals

An overall broadband velocity screen against the ISO 20816 zone boundaries for the four traditional machine
classes. It does not identify a fault -- overall level is deliberately insensitive to what is causing it, and a
serious bearing defect can hide under a low overall reading because its energy sits at high frequency where
velocity is small. Bearing condition is assessed with acceleration or envelope measurement, not this. The
standard has machine-specific parts (pumps, turbines, reciprocating machines, wind turbines) with their own
criteria that supersede the general classes, and reciprocating machines are not covered by these values at all.
Displacement measured on the shaft, not velocity on the housing, governs machines with fluid-film bearings.
Measurement location, transducer mounting, and frequency band all change the number. The applicable part of ISO
20816, the machine manufacturer's alarm limits, and a qualified analyst govern.
