# roughlogic.com Specification v1821 -- BACnet MS/TP Segment Loading and Token Loop Time (`calc-controls.js`, Group C HVAC, building automation and controls, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-controls.js`**
> (Group C HVAC, hub `/groups/hvac/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** An MS/TP segment is a token ring on a twisted pair, and the worst-case response to any command is one token rotation. The rotation time grows with device count and with traffic, so a segment loaded to the protocol's address limit is responsive to nothing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive baud rate, device count, or frame length, or a transmitting share outside 0 to 1 returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the MS/TP token rotation timing relation with ASHRAE Standard 135 and the controller manufacturers' documentation named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`bacnet mstp segment loading`, `token loop time mstp`, `devices per mstp segment`, `mstp baud rate response time`, `field bus device count`.

## 2. The tile

### 2.1 `mstp-segment-loading` -- BACnet MS/TP Segment Loading and Token Loop Time

```
the mechanism    master devices pass a token in address order; a device may only
                 transmit while it holds the token
token pass       an 8 octet frame at 10 bits per octet, plus a turnaround delay of
                 about 40 bit times
idle rotation    devices x (token frame + turnaround) -- the floor, with no data
data frames      a device with something to send adds its frame time:
                 octets x 10 / baud
loop time        idle rotation + the data frames actually sent in that rotation
worst-case       one full token rotation; a global command or a poll waits that
response         long before the last device acts
the address      the protocol permits 127 master addresses; RESPONSIVENESS, not
limit            addressing, is what actually limits a segment
practical        roughly 32 devices at 76,800 baud is a common design limit; also
                 bounded by cable length, which falls as baud rises
```

The token is a serialising mechanism and everything follows from that. Only one device transmits at a time,
so the bus's total throughput is fixed and adding devices divides it rather than expanding it. A segment is not
a network where more nodes means more capacity; it is a queue, and every device added lengthens the wait for
every other one.

The distinction between the address limit and the practical limit is where designs go wrong. The protocol
allows 127 master addresses on a segment and installers reasonably read that as a capacity. It is a naming
limit, not a performance one -- a segment carrying that many devices has a token rotation measured in the high
hundreds of milliseconds before any useful traffic, which makes coordinated control across the segment
sluggish and makes anything resembling real-time interlocking unworkable.

Baud rate and cable length trade against each other, which caps the easy remedy. Raising the rate shortens
every frame proportionally and is the first thing to try, but the maximum cable length falls as the rate rises
and the bus becomes less tolerant of poor wiring, stubs, missing termination, and grounding problems. On a
long existing run the higher rate simply will not work, and the answer is another segment and another router
port rather than a faster one.

**Inputs:** the baud rate, the device count on the segment, the token frame and turnaround times, the typical data frame length, the share of devices transmitting each rotation, and an alternative device count and baud rate

**Outputs:** the token pass and turnaround time per device, the idle token rotation, the data frame time, the loop time with traffic, the worst-case response, and the same figures at a larger device count and a lower baud rate

## 3. Worked example

A segment of 32 devices at 76,800 baud:

```
token frame  = 8 x 10 / 76,800 = 1.042 ms
turnaround   = 40 bit times = 0.521 ms
per device   = 1.562 ms
idle rotation= 32 x 1.562 = 50.0 ms
```

**50 ms just to pass the token round with nothing to say.** Add traffic -- 50% of the devices sending a
50 octet frame each rotation:

```
frame time = 50 x 10 / 76,800 = 6.51 ms
data       = 16 x 6.51 = 104.2 ms
loop time  = 154.2 ms
```

**154 ms is the worst-case response to any command that has to reach the last device in the rotation.** For
scheduled and reset sequences that is entirely adequate; for a safety interlock or a coordinated shutdown it is
not, and that judgement is what the number is for.

**Now load the segment toward what the address space permits:**

```
64 devices: idle 100.0 ms, data 208.3 ms, loop 308 ms
```

**308 ms -- 2.0 times the 32 device figure**, and still only half the 127 addresses the protocol allows.
**The address limit is a naming limit, not a capacity**, and a segment built to it responds in the high
hundreds of milliseconds before anyone adds a trend poll.

**Dropping the baud rate is the same problem from the other side:**

```
32 devices at 38,400 baud: loop = 308 ms
```

**Exactly double, because every frame takes twice as long.** Raising the rate is the first remedy and it is
bounded: **maximum cable length falls as baud rises**, and the bus becomes far less tolerant of stubs, missing
termination, and grounding faults. On a long existing run the faster rate will not run at all, and **the answer
is another segment, not another setting.**

## 4. Scope and non-goals

A timing estimate for planning. It is a simplified model of the MS/TP master node state machine: the real rotation depends on Nmax_master and how the token skips absent addresses, on Nmax_info_frames and how many frames a device may send per token, on the timeouts that govern token recovery when a device drops, and on the poll-for-master cycle that discovers new devices -- and token loss and recovery, not steady-state rotation, is what makes a marginal segment behave badly. Frame lengths vary with the service and the data; a segment carrying trend uploads or a firmware download behaves nothing like one carrying present-value polls. It does not address the physical layer, which is where most MS/TP problems actually live: cable type and length limits at each baud rate, termination and biasing, stub length, shield grounding, and ground potential differences between buildings. It does not design the network architecture, size routers or the IP backbone, or address device addressing, MAC address assignment, and the interaction with a building's IT network. ASHRAE Standard 135 and the controller manufacturers' documentation, the applicable cable length limits for the baud rate, and the controls engineer govern.
