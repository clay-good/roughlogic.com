# roughlogic.com Specification v1711 -- HDPE Butt Fusion Interface Pressure and Cycle Time (`calc-process.js`, Group B Plumbing and Gas, plastics, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-process.js`**
> (Group B, Plumbing and Gas -- the existing category, hub `/groups/plumbing/`; plastics processing), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Butt fusion joins polyethylene pipe by melting two faces and pressing them together, and the pressure that matters is the pressure at the pipe face -- which is the machine gauge pressure scaled by the ratio of the pipe area to the cylinder area. Using the gauge number directly makes a bad joint.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive pipe diameter, wall thickness, cylinder area, or interfacial pressure, or a dimension ratio at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the interfacial-to-gauge pressure conversion with ASTM F2620 and 49 CFR Part 192 named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`hdpe butt fusion pressure`, `fusion gauge pressure calculation`, `interfacial pressure polyethylene`, `drag pressure fusion`, `astm f2620 fusion`.

## 2. The tile

### 2.1 `hdpe-fusion-pressure-time` -- HDPE Butt Fusion Interface Pressure and Cycle Time

```
interfacial pressure  the specified pressure at the pipe face, from the manufacturer
                      commonly 75 psi for the fusion phase in ASTM F2620 practice
pipe face area        the annular area of the pipe wall
machine gauge         P_gauge = interfacial pressure x pipe area / cylinder area
drag pressure         the pressure to move the carriage and pipe, ADDED to the calculated
                      gauge pressure; measured before every joint
heat soak             time at the heater by pipe wall thickness
cool time             under pressure, by wall thickness; removing pressure early ruins it
bead                  the visual check; size and shape indicate a correct joint
```

The gauge conversion is the arithmetic that makes fusion work and the one most often bungled. The specification
gives a pressure at the pipe face; the machine's hydraulic cylinder acts on a different area, so the gauge reading
that produces the specified face pressure depends on the pipe size and the machine's cylinder area. A crew running
a fixed gauge pressure across pipe sizes is over-pressing small pipe and under-pressing large.

Drag is the second term and it is measured rather than calculated. It is the pressure needed just to move the
carriage and the pipe against friction -- more on a long pull, more uphill, more with a heavy pipe -- and it is
added to the calculated fusion pressure because it does no work at the joint. A crew that skips the drag
measurement under-presses every joint by however much drag there was, and drag varies from joint to joint on the
same job.

The times are wall-thickness driven and the cool time is where impatience causes failures. The joint is soft for
a long time after the heater comes out, and releasing pressure before the cool time is complete lets the joint
relax and produces a weak fusion that looks correct externally. The bead is the visible check on the heat and
pressure; nothing external shows an early pressure release.

**Inputs:** pipe outside diameter and dimension ratio or wall thickness, the machine total effective cylinder area, the specified interfacial pressure, the measured drag pressure, and the heat soak and cool times from the procedure

**Outputs:** the pipe wall thickness and face area, the theoretical gauge pressure for the specified interfacial pressure, the total gauge pressure with drag added, the heat soak and cool times for the wall thickness, and the gauge pressure at an alternative pipe size

## 3. Worked example

A 6.625 in OD DR 11 pipe on a machine with 3.15 sq in of total effective cylinder area, at a 75 psi
interfacial pressure:

```
wall thickness = 6.625 / 11 = 0.602 in
pipe face area = pi/4 x (6.625^2 - (6.625 - 2 x 0.602)^2) = 11.40 sq in
gauge pressure = 75 x 11.40 / 3.15 = 271 psi
```

Then add the measured drag. If the carriage and pipe drag at 60 psi:

```
total gauge = 271 + 60 = 331 psi
```

**331 psi on the gauge**, of which only
271 is doing work at the joint.

**Skipping the drag measurement** and setting 271 psi under-presses the
joint by the whole 60 psi of drag -- and drag changes with every setup, so it cannot be assumed from the last
joint.

**Running a fixed gauge across sizes** is the other error. The same machine on 12 in pipe has a face area several
times larger, so the correct gauge pressure is several times higher; running the 6 in number on 12 in pipe badly
under-presses it, and running the 12 in number on 6 in pipe over-presses and squeezes the melt out of the joint.

Cool time is where the joint is lost after everything else was right: the pressure stays on for the full cool
period by wall thickness, and releasing early relaxes a joint that will look correct and test badly.

## 4. Scope and non-goals

A pressure conversion. The interfacial pressure, heat soak and cool times, facing and alignment requirements,
heater temperature, and bead acceptance criteria come from the applicable fusion procedure -- ASTM F2620, the
pipe manufacturer's instructions, and for gas piping the operator's written procedure -- and those govern. The
machine's total effective cylinder area is a machine-specific value from its manufacturer and is not
interchangeable between machines. Drag pressure must be measured on every joint, not assumed. It does not address
operator qualification, which is required: fusion joints are made by qualified personnel to a qualified
procedure, and for gas piping under 49 CFR Part 192 both the procedure and the person must be qualified. It does
not address joint inspection, bend testing, or the data logging many specifications require. ASTM F2620, the pipe
and machine manufacturers' instructions, and for gas service 49 CFR Part 192 govern.
