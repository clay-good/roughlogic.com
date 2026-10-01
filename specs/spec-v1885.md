# roughlogic.com Specification v1885 -- Lift Station Outage: Time to Overflow and Pump-and-Haul Loads (`calc-reliefwater.js`, Group M Water and Wastewater Operations, emergency water supply, 1 New Tile)

> **Status: LANDED 2026-09-30 (proposed 2026-09-25). Single-tile spec.** Part of [scope-disaster-response](scope-disaster-response.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-reliefwater.js`**
> (Group M Water and Wastewater Operations, hub `/groups/water/`), no new dependency and no new network call. Inherits spec.md through spec-v1878.md.
>
> **The gap.** When a storm takes out power to a sewage lift station, the question is how many minutes until it overflows into basements and streets, and whether the portable generator can get there first. `wet-well-cycle-time` and `sump-basin-sizing` size the working volume for pump starts; none computes the emergency storage or the vacuum-truck loads when the generator cannot.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive wet-well dimension, inflow, or truck capacity returns `{ error }`; a negative storage depth or sewer length returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): Great Lakes-Upper Mississippi River Board, *Recommended Standards for Wastewater Facilities* (Ten States Standards), Sections 47.1, 47.2, and 47.433, named as the requirement, the arithmetic named as a mass balance, the state regulatory agency and the utility's emergency response plan named as governing, GOVERNANCE.water.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`lift station power outage`, `time to overflow wet well`, `sewage pump station storage`, `vac truck pump and haul`, `lift station generator response time`.

## 2. The tile

### 2.1 `lift-station-outage-storage` -- Lift Station Outage: Time to Overflow and Pump-and-Haul Loads

```
wet well      A x (overflow elevation - high-alarm elevation) x 7.4805 gal
              (round: pi/4 x D^2; rectangular: L x W)
sewer         pipe storage BELOW the overflow elevation: 0.0408 x d_in^2 gal/ft
              x length (the incoming gravity line surcharges before it spills)
storage       wet well + sewer
time          storage / inflow (min)
response      detection + travel + hookup (min); shortfall = inflow x response
              - storage (gal) when positive
haul loads    ceil((inflow x outage - storage) / truck gallons)
```

A lift station without power becomes a tank with a fixed volume and an inflow that does not stop. Everything above
the high-level alarm and below the lowest point where sewage escapes -- a wet-well overflow, a manhole rim, or the
lowest basement drain on the line -- is emergency storage, and the incoming gravity sewer adds to it as it backs up.
Divide by the inflow and the result is the number of minutes the station can wait. The Ten States Standards require
that storage to cover detection of the failure plus the transportation and connection of portable generating
equipment, which turns the time to overflow into a test against a response time.

The response time is usually longer than people guess, and in a regional outage it is much longer. Detection needs
a working alarm and someone to receive it; travel is across storm-damaged roads; hookup needs a generator of the
right size with the right connection, and in a widespread event that generator is committed to several stations at
once. The tile reports the shortfall in gallons when the response loses the race, because the shortfall is what
ends up in basements.

When the generator cannot arrive or the outage outlasts the fuel, the remaining option is to pump and haul. The
tile counts the vacuum-truck loads for a stated outage, net of the storage already available, which is usually the
number that shows why a portable pump connection and a generator are worth their cost.

**Inputs:** the wet-well shape and dimensions, the depth from the high-level alarm to the overflow or lowest basement elevation, the length and diameter of gravity sewer below that elevation, the inflow at the time of year and hour, the detection, travel, and hookup times, the outage duration, and the vacuum-truck capacity

**Outputs:** the wet-well and sewer storage, the time to overflow, the response time and shortfall, and the pump-and-haul truck loads for the outage

## 3. Worked example

An 8 ft diameter wet well with 3 ft between the high-level alarm and the lowest basement served, 1,200 ft of 8 in
gravity sewer below that elevation, 100 gpm inflow:

```
wet well  pi/4 x 8^2 x 3 x 7.4805 = 1,128 gal
sewer     0.0408 x 8^2 x 1,200 = 3,133 gal
storage   4,261 gal
time      4,261 / 100 = 42.6 min
```

**Forty-three minutes before sewage reaches the lowest basement** -- and three-quarters of that storage is in the
sewer, not the wet well.

**The generator crew needs 20 minutes to be alerted, 60 to drive, and 25 to hook up:**

```
response   20 + 60 + 25 = 105 min
shortfall  100 x 105 - 4,261 = 6,239 gal
```

**The crew loses by more than an hour, and about 6,200 gallons backs up into the lowest property on the line.**

**An 8-hour outage with no generator available, 3,000 gal vacuum trucks:**

```
(100 x 480 - 4,261) / 3,000 = 14.6 -> 15 loads
```

**Fifteen vacuum-truck loads to hold one small station through one night** -- which is why the standards require a
portable pump connection on the force main and a plan for who brings the generator.

## 4. Scope and non-goals

An emergency-storage and response-time check using a mass balance. Inflow varies by hour and rises sharply with inflow and infiltration during the storm that caused the outage; the design value should be the wet-weather flow for the event, not the dry-weather average. It treats the gravity sewer as full-pipe storage below the overflow elevation and ignores the slope of the line, which makes the sewer figure an upper bound. It does not size the standby generator (`generator-motor-starting`, `generator-fuel-runtime`), the pumps (`pump-tdh`), or the wet well's working volume (`wet-well-cycle-time`), and it does not address overflow permitting, spill reporting, or cleanup. The Ten States Standards, the state regulatory agency, and the utility's emergency response plan govern.
