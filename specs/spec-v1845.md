# roughlogic.com Specification v1845 -- Deicing Salt Application Rate by Pavement Temperature (`calc-winterops.js`, Group G Cross-Trade Utilities, snow and ice management, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-winterops.js`**
> (Group G Cross-Trade Utilities, hub `/groups/cross-trade/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Salt is applied by the pound per lane-mile and the rate is set by pavement temperature, not air temperature. As the pavement cools the rate climbs steeply, so a cold event empties the hopper in half the distance and doubles the reload trips.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive application rate, route length, or hopper capacity, or a non-positive lot area returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the lane-mile basis and published application rate bands with the applicable agency policy and a verified spreader calibration named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`deicing salt application rate`, `pounds per lane mile salt`, `pavement temperature salt rate`, `salt truck coverage per load`, `anti icing versus deicing rate`.

## 2. The tile

### 2.1 `salt-application-rate` -- Deicing Salt Application Rate by Pavement Temperature

```
lane-mile        one 12 ft lane, one mile long = 63,360 sq ft; the standard
                 basis for every published rate
rate bands       roughly 100 to 200 lb per lane-mile at 30 degF and above,
                 200 to 300 at 25 to 30, 300 to 400 at 20 to 25, and 400 to 600
                 below 20 -- the published guidance bands
pavement         the controlling temperature, measured with an infrared gun or a
temperature      road sensor; air temperature is not a substitute and commonly
                 differs by several degrees
lot conversion   a parking lot in square feet / 63,360 gives its lane-mile
                 equivalent
coverage         hopper capacity / (rate x lane-miles per route) = routes per load
the cold penalty the rate roughly doubles from mild to cold, which HALVES the
                 coverage per load and doubles the reload trips
the floor        below about 15 degF salt alone is not effective at any rate
                 (`ice-melt-working-temperature`)
```

Pavement temperature is the controlling variable and it is not the air temperature. Asphalt and concrete hold
and release heat on their own schedule, so a bridge deck can be several degrees below the road that leads onto
it, a shaded north-facing lot can be below a sunlit one a hundred yards away, and a pavement that has been
radiating to a clear sky all night can be well below the air. Every published rate is written against pavement
temperature, and a crew treating from an air reading is applying the wrong rate about half the time.

The rate bands climb steeply because salt's melting capacity collapses as it gets colder, not because colder
ice is harder to break. A pound of salt at thirty degrees does many times the work it does at twenty
(`ice-melt-working-temperature`), so holding the same result requires many times the material. The bands in
the guidance are that collapse expressed as an application rate.

Coverage per load is where the arithmetic becomes an operations problem. A truck carries a fixed tonnage, so
doubling the rate halves the distance it covers, and the reload trips it was not planning to make come out of
the cycle time the route was designed around (`plow-route-cycle-time`). A cold event therefore degrades
service twice over: the material works less well, and the truck spends more of the storm at the barn.

**Inputs:** the pavement temperature and the rate band it selects, the route length in lane-miles or the lot area, the spreader hopper capacity, and an alternative rate for a colder condition

**Outputs:** the lane-mile equivalent of a lot area, the material per route pass, the routes covered per hopper load, the reload trips per pass, and the same figures at the colder rate

## 3. Worked example

A 30 lane-mile route at 250 lb per lane-mile, a mild-event rate:

```
material  = 250 x 30 = 7,500 lb = 3.75 tons per pass
hopper    = 8 tons = 16,000 lb
coverage  = 16,000 / 7,500 = 2.13 route passes per load
```

**One load covers 2.1 passes**, so the truck reloads once every two passes and the reload fits comfortably in
the cycle.

**Now let the pavement drop into the 400 to 600 lb band:**

```
material  = 500 x 30 = 15,000 lb = 7.50 tons per pass
coverage  = 1.07 route passes per load
```

**1.07 passes per load -- the truck now reloads nearly every pass**, and the trips it makes back to the barn
come straight out of the cycle time the route was designed around (`plow-route-cycle-time`). **Doubling the
rate did not just double the material; it doubled the reload trips as well**, and service degrades on both
counts at once.

**For a parking lot, convert to lane-miles first:**

```
100,000 sq ft / 63,360 sq ft per lane-mile = 1.58 lane-miles
at 250 lb/lane-mile = 395 lb per application
```

**395 lb on a 2.3 acre lot.** That conversion is what lets published road guidance be used on
commercial property, where rates are otherwise quoted by habit rather than by reference.

**And measure the pavement, not the air.** A bridge deck, a shaded north-facing lot, and a pavement that has
radiated to a clear sky all night are each several degrees below the air temperature -- **which is one rate
band, and sometimes two.**

## 4. Scope and non-goals

A rate selection and coverage aid. Application rates are set by the agency's or the contractor's own policy, informed by published guidance from the Salt Institute, Clear Roads, and state maintenance manuals, and they vary with the material, whether it is pre-wetted or treated, the storm type, traffic volume, and whether the operation is anti-icing before the event or deicing after it -- anti-icing uses far less material and is a different practice, not a lower rate. This tile selects nothing: the band and the rate are entered. It does not address spreader calibration, which is what determines whether the rate on the controller is the rate on the road and which has to be verified by a catch test rather than assumed, or the spread pattern, bounce, and scatter that put material off the pavement entirely. It does not address pre-wetting, brine blends, or the organic and chloride alternatives (`ice-melt-working-temperature`, `brine-batch-salinity`). It takes no position on the environmental consequences of chloride application, which are cumulative, or on the state and local restrictions that increasingly govern it. The applicable agency policy and published rate guidance, a verified spreader calibration, and a measured pavement temperature govern.
