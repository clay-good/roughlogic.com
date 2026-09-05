# roughlogic.com Specification v1581 -- Revolving Door and Turnstile Throughput (`calc-doorhardware.js`, Group E Carpentry and Construction, door hardware, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-doorhardware.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; door hardware and locksmithing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A revolving door is chosen for the envelope, not the traffic, and then it becomes the bottleneck at shift change. Throughput is compartments per minute times people per compartment, and comparing it against the peak arrival rate is what decides how many doors a lobby needs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive rotation rate, wing count, compartment capacity, or peak arrival rate returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the compartment throughput relation with the adopted building and fire codes named as governing egress credit, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`revolving door throughput`, `turnstile capacity people per hour`, `lobby entrance sizing`, `speed lane throughput`, `entrance queue calculation`.

## 2. The tile

### 2.1 `revolving-door-throughput` -- Revolving Door and Turnstile Throughput

```
revolving door   people/h = rpm x wings x people per compartment x 60
                 manual doors typically 2 to 4 rpm; automatic slower for accessibility
turnstile        people/h from the cycle time; a tripod runs 15 to 30 per minute one way
optical/speed lane faster still, but tailgating control lowers effective throughput
queue check      compare against the peak arrival rate, not the daily average
egress           revolving doors and turnstiles carry code limits on egress credit
```

The headline throughput and the achievable one differ, and the difference is behaviour. A four-wing door at
three revolutions a minute is theoretically 1,440 people an hour with two per compartment, and in practice people
arrive unevenly, carry things, hesitate, and do not fill every compartment -- so a realistic figure is a large
discount on the theoretical one. Designing to the theoretical number produces a queue at the one moment the
building is judged on it.

The comparison that matters is against the PEAK. A building of two thousand people does not arrive over eight
hours; it arrives in two twenty-minute waves, and the design case is that wave. Dividing daily population by
operating hours produces a number that flatters every entrance ever built.

Egress is a separate and code-governed matter. Revolving doors and turnstiles receive limited or no credit toward
required egress capacity depending on the code and the arrangement, so a lobby that meets its throughput target
with revolving doors alone still needs conventional swinging doors for egress -- and the two requirements are
sized independently.

**Inputs:** rotation rate, number of wings, people per compartment, a realism discount factor, the peak arrival rate and its duration, and the number of doors or lanes

**Outputs:** the theoretical and discounted throughput per door, the total throughput for the entered device count, the peak arrival rate against it, the queue that builds over the peak period, and the devices required to clear the peak without a queue

## 3. Worked example

A 4-wing revolving door at 3 rpm with 2 people per compartment:

```
theoretical = 3 x 4 x 2 x 60 = 1,440 people/h
at a realistic 60% utilization = 864 people/h
```

Now the peak. A building of 2,000 occupants with 70% arriving in a 20 minute window:

```
peak arrivals = 2,000 x 0.70 = 1,400 people in 20 min = 4,200 people/h equivalent
doors required = 4,200 / 864 = 4.9 -> 3 doors
```

Three revolving doors, where the daily-average calculation would have said

```
2,000 / 8 hours = 250 people/h -> 0.29 doors
```

one door. That is the whole error: **the average says one and the peak says three**, and the building is judged
at 8:50 in the morning.

And separately from all of it, the lobby still needs conventional egress doors sized for the occupant load,
because the revolving doors carry limited or no egress credit.

## 4. Scope and non-goals

A throughput comparison from rates the user supplies. The utilization discount is a judgment rather than a
measurement, and real throughput depends on bag and cart traffic, badge or turnstile interaction time, wheelchair
and accessible-door usage diverting traffic, and whether people are entering, leaving, or both at once --
bidirectional use roughly halves a revolving door's one-way figure. It does not address egress: the credit a
revolving door or turnstile receives toward required egress capacity, the collapsible-wing requirement, and the
adjacent swinging door requirement are set by the adopted building and fire codes and must be satisfied
independently of throughput. It does not address accessibility, which requires an accessible route that a
revolving door or turnstile does not provide. The adopted building, fire, and accessibility codes, the
manufacturer's rated capacities, and the AHJ govern.
