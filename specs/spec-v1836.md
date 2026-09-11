# roughlogic.com Specification v1836 -- Wind-Generated Wave Height from Fetch (`calc-marine.js`, Group E Carpentry and Construction, marine construction and dredging, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-marine.js`**
> (Group E Carpentry and Construction, hub `/groups/construction/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Waves on an enclosed water grow with the wind and with the distance it blows across, and both matter less than they feel like they should -- the fetch enters as a square root. What the relation also gives is how long the wind must blow before that height is reached at all.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive wind speed or fetch returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the fetch-limited wave growth relations of the Shore Protection Manual lineage with the Coastal Engineering Manual and a measured wave record named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`wave height from fetch`, `fetch limited wave growth`, `significant wave height wind`, `shore protection manual wave hindcast`, `enclosed water wave estimate`.

## 2. The tile

### 2.1 `wave-height-fetch` -- Wind-Generated Wave Height from Fetch

```
adjusted wind    U_A = 0.71 U^1.23 with U in m/s -- a stress-equivalent wind
                 speed, not the anemometer reading
dimensionless    X = g F / U_A^2, with F the fetch in metres
fetch
wave height      H_mo = 0.0016 sqrt(X) x U_A^2 / g, in metres
peak period      T_p = 0.2857 X^(1/3) x U_A / g, in seconds
duration         t = 68.8 X^(2/3) x U_A / g -- the time the wind must blow at that
                 speed for the fetch-limited height to develop
fetch-limited    if the wind blows longer than t, the fetch governs; if it stops
vs duration      sooner, the DURATION governs and the waves are smaller
the square root  H goes as the square root of fetch, so doubling the fetch raises
                 the height only about 41%
wind             enters roughly as U^1.2 inside a squared term, so it is by far the
                 stronger variable
```

These relations are a hindcast, which is a way of saying they estimate what the sea should have been from what
the wind was. That is exactly what a marine contractor needs: a workability assessment for a site with no wave
record, an estimate of the condition a temporary structure has to survive, or a check on whether a barge can
be safely moored on an exposed face. It is not a forecast and it is not a substitute for a measured record
where one exists.

The square root on fetch is the result that surprises people and it is the reason enclosed waters are workable
at all. Doubling the distance the wind blows over -- moving from one end of a lake to the other, or losing the
shelter of a headland -- raises the wave height by about forty percent rather than doubling it. Wind speed is
the variable that matters, entering the relation with a much stronger dependence, which is why a short fetch in
a gale is worse than a long fetch in a breeze.

The duration term is the one most often left out and it is frequently what governs. A fetch-limited height
assumes the wind has blown long enough for the sea to fully develop over that distance, and on a short fetch
that is a matter of an hour or two, while on a long one it can exceed the duration of the weather system
itself. A squall that lasts twenty minutes does not build the wave its speed and fetch would suggest, and a
contractor reading only the fetch-limited number will overestimate the condition for short events and be
caught out by sustained ones.

**Inputs:** the wind speed, the fetch length, and optionally a second fetch and wind speed for comparison

**Outputs:** the adjusted wind speed, the dimensionless fetch, the significant wave height in metres and feet, the peak period, the wind duration required to reach the fetch-limited height, and the heights at an alternative fetch and wind speed

## 3. Worked example

A 40 mph wind blowing across a 5 mile fetch:

```
U_A = 0.71 x (40 mph = 17.88 m/s)^1.23 = 24.64 m/s
X   = 9.81 x 8,047 / 24.64^2 = 130.0
H   = 0.0016 x sqrt(130.0) x 24.64^2 / 9.81 = 1.13 m = 3.7 ft
T_p = 0.2857 x 130.0^(1/3) x 24.64 / 9.81 = 3.6 s
```

**3.7 ft significant wave height at a 3.6 second period** -- a short, steep, uncomfortable sea, which is what
an enclosed water produces and why small craft find a lake worse than its wave height suggests.

**But only if the wind blows long enough:**

```
duration required = 68.8 x 130.0^(2/3) x 24.64 / 9.81 = 1.23 hours
```

**1.23 hours of sustained 40 mph wind** before that height is reached. A squall lasting twenty minutes produces
a much smaller sea at the same wind speed, because **the duration governs rather than the fetch** -- and a
contractor reading only the fetch-limited number overestimates short events and is caught out by sustained
ones.

**Doubling the fetch does far less than doubling:**

```
10 mile fetch, same wind: H = 5.2 ft
```

**41 percent taller for twice the distance** -- the square root at work, and the reason an enclosed water
stays workable even when the geometry is unfavourable.

**Raising the wind does much more:**

```
60 mph on the original 5 mile fetch: H = 6.1 ft
```

**65 percent taller for 50 percent more wind.** Wind speed is the dominant variable by a wide margin,
which is why marine workability decisions are made on the forecast wind rather than on the site's geometry --
**the geometry was fixed when the berth was built and the wind is what changes.**

## 4. Scope and non-goals

A hindcast estimate for simple, deep-water, fetch-limited conditions. The relations are from the Shore Protection Manual lineage and later guidance in the Coastal Engineering Manual differs; they assume a constant wind speed and direction over an unobstructed fetch of uniform depth, and a real fetch is irregular, the wind veers, and an effective fetch accounting for the width of the water body is what should be used rather than the maximum straight-line distance. They are deep-water relations: in shallow water depth limits the wave height and a depth-limited analysis governs, which on most enclosed and nearshore waters is the case that matters. The adjusted wind speed conversion assumes a particular measurement height and overwater exposure, and an anemometer reading taken over land, at a different height, or in unstable air is not the wind these relations want. They give a significant wave height, which is a statistical measure -- individual waves substantially exceed it, and a maximum wave is commonly taken near twice it. They do not address wave refraction, shoaling, breaking, diffraction around structures, swell arriving from elsewhere, or wave loads on a structure. The Coastal Engineering Manual or the applicable current guidance, a measured wave record where one exists, and a coastal engineer govern.
