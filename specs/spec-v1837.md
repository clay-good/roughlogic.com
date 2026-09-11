# roughlogic.com Specification v1837 -- OTDR Event Distance and Index of Refraction (`calc-telecom.js`, Group A Electrical, fiber optic outside plant, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-telecom.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** An OTDR measures time and reports distance, and the conversion needs the fiber's group index. Set it wrong and every event on the trace is displaced -- and even set right, the number is fiber length, which is not where the crew should dig.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive round trip time or distance, or an index of refraction at or below 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the OTDR time-of-flight distance relation and the loose-tube excess fiber length convention with the cable manufacturer's data and the route as-built record named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`otdr event distance`, `group index of refraction fiber`, `otdr distance accuracy`, `fiber length versus cable length`, `excess fiber length loose tube`.

## 2. The tile

### 2.1 `otdr-event-distance` -- OTDR Event Distance and Index of Refraction

```
the measurement  the OTDR times the round trip of a pulse to an event and back
distance         d = c x t / (2 n), with n the fiber's GROUP index of refraction
                 at the test wavelength -- near 1.468 for standard single mode
                 at 1550 nm and slightly different at 1310
the divisor      2, because the light went out and came back
index error      a wrong index scales every distance on the trace by the ratio of
                 the true index to the one entered
fiber length     what the OTDR measures
cable length     shorter: fiber in a loose tube lies helically and carries 0.5 to
                 1.5% EXCESS LENGTH over the cable
route length     shorter again: slack coiled at each splice enclosure and each
                 end never leaves the vault
the consequence  the OTDR's distance is not the distance along the ground
```

The index of refraction is a fiber property and the OTDR does not know it. It is entered by the technician,
usually from the cable's datasheet, and it scales every distance on the trace linearly -- so an error of a
fraction of a percent is a fraction of a percent of the whole span. On a short jumper that is inches; on a
long haul route it is the distance between access points, and a crew sent to the wrong manhole loses a day.

Fiber length and route length are different quantities and the difference is systematic rather than random.
Loose-tube cable lays its fibers helically inside the tube so they are never in tension as the cable bends and
contracts, which means there is more fiber than cable by a manufacturer-specified excess. Then slack is coiled
at every splice enclosure and at both ends, deliberately, because a future repair needs it. Every one of those
metres is in the OTDR's answer and none of it is on the ground.

Correcting for both is what turns a trace distance into a dig location, and the corrections are knowable. The
excess fiber length is on the cable's datasheet; the slack is on the as-built record, if anyone kept one. A
route without a slack record is a route where the OTDR distance can only be converted approximately, which is
the argument for recording it at the time of construction rather than at the time of the outage.

**Inputs:** the round trip time or the OTDR reading and the index it was set to, the fiber's true group index, the excess fiber length percentage, the slack coiled per splice point, and the number of splice points

**Outputs:** the fiber distance at the entered index, the distance at a corrected index and the error between them, the same error scaled to a long span, the cable length after removing excess fiber, and the route distance after removing the coiled slack

## 3. Worked example

An event at 50 microseconds round trip, with the OTDR set to n = 1.4682:

```
d = 299,792,458 x 50e-6 / (2 x 1.4682) = 5,104.8 m = 16,748 ft
```

**Now suppose the fiber's true index is 1.4700:**

```
d = 5,098.5 m -- 6.3 m closer than reported
```

**6.3 metres out of 5,105, from a difference of 0.0018 in the index.** That is 0.122 percent, and it scales:
on a 40 km span the same index error displaces every event by **49 metres** -- 161 ft, which is the
distance between access points on most routes.

**And the correctly computed fiber distance is still not where to dig.** Take the excess fiber out of the loose
tube and the slack out of the enclosures:

```
fiber   = 5,105 m  (what the OTDR reports)
cable   = 5,105 / (1 + 0.010) = 5,054 m
route   = 5,054 - 5 x 15.2 m of coiled slack = 4,978 m
```

**127 metres -- 416 ft -- between the OTDR's answer and the ground.** Every one of those metres is
deliberate: the excess fiber keeps the glass out of tension as the cable moves, and the slack exists so a
future repair can be pulled into a splice trailer (`fiber-slack-storage`).

**Both corrections are knowable and only one is usually recorded.** The excess fiber length is on the cable's
datasheet. **The slack is on the as-built, if anyone kept one** -- which is the argument for recording it at
construction rather than at the outage.

## 4. Scope and non-goals

A conversion and a correction. It does not operate the OTDR or interpret a trace: pulse width, range, averaging, and wavelength selection all decide what events are visible and how accurately they are located, and a launch fiber is required to see the first connector at all. Distance resolution is limited by the instrument's sampling and by the pulse width, and two events closer together than the dead zone appear as one -- a short pulse locates precisely and reaches less far, and the trade is made per test. The group index varies with wavelength and between fiber types and must come from the cable manufacturer's data for the fiber and wavelength in use. Excess fiber length is a manufacturer's figure that varies between cable designs and is not constant along a route. It does not certify a link, which requires bidirectional testing and a power meter measurement, or interpret loss, reflectance, and gainers, which arise from index mismatch across a splice and require bidirectional averaging. The cable manufacturer's fiber and excess length data, the route's as-built record, and the applicable test standards govern.
