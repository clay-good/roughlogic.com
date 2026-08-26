# roughlogic.com Specification v1399 -- Great-Circle Distance and Initial Bearing (calc-field.js, Group P, field, backcountry, and SAR, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-field.js`**
> (Group P, field, backcountry, and SAR), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Group P converts UTM and lat-lon and computes declination, but the distance and bearing between two latitude-longitude pairs -- the single most common thing anyone does with a pair of coordinates -- is not in the catalog. Plane-coordinate inverse is there; the spherical one is not, and over any distance that matters they differ.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a latitude outside -90 to 90, a longitude outside -180 to 180, or two identical points (the bearing is undefined), returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the haversine formula for great-circle distance and the standard initial-bearing (forward azimuth) formula on a sphere, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `great-circle-distance` -- Great-Circle Distance and Initial Bearing

```
a        = sin^2(dlat/2) + cos(lat1) cos(lat2) sin^2(dlon/2)
distance = 2 R asin(sqrt(a))
bearing  = atan2( sin(dlon) cos(lat2),
                  cos(lat1) sin(lat2) - sin(lat1) cos(lat2) cos(dlon) )
```

The haversine form is used rather than the plain spherical law of cosines because it stays numerically well
behaved at short distances, where the cosine form loses precision badly. `R` is the mean Earth radius, 3,958.8
miles or 6,371 km.

The bearing output carries a warning that is easy to miss: it is the **initial** bearing. A great circle is not a
constant-bearing path, so the azimuth changes continuously along the route, and the bearing at the far end is not
the reciprocal of the bearing at the near end. Over a few miles the difference is negligible; over several hundred
it is degrees. A route flown or steered on a fixed compass bearing is a rhumb line, and it is a longer path.

**Inputs:** latitude and longitude of both points in decimal degrees (or degrees-minutes-seconds), and the
distance unit.

**Outputs:** great-circle distance in miles, kilometers, and nautical miles; initial bearing; final bearing; and
the difference between them.

## 3. Worked example

Denver (39.7392 N, 104.9903 W) to Chicago (41.8781 N, 87.6298 W):

```
distance = 918.2 statute miles = 1,477.7 km = 797.9 nautical miles
initial bearing = 75.1 degrees
```

Just north of due east at the start -- and by Chicago the great circle has swung to a final bearing of 86.5
degrees, eleven degrees of drift over nine hundred miles. Anyone who set 75 degrees on a compass in Denver and
held it would arrive well north of Chicago. That divergence is the whole reason the tile reports both bearings.

## 4. Scope and non-goals

A spherical Earth. The real Earth is an oblate spheroid, and haversine distances carry an error up to roughly
0.5% against a proper geodesic (Vincenty or Karney) computation -- fine for search planning, route estimation,
and dispatch, not adequate for surveying, boundary work, or anything that will be recorded. Coordinates must be
in the same datum; a WGS 84 pair and a NAD 27 pair for the same physical point can differ by a hundred metres or
more, which over a short baseline swamps every other error here. The tile ignores elevation entirely, so it
returns horizontal distance at sea level. For plane-coordinate work use the catalog's COGO inverse instead. A
licensed surveyor governs anything of record.
