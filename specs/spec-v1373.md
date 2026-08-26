# roughlogic.com Specification v1373 -- Haze and Fog Machine Output for a Venue (calc-stage.js, Group N, stage and live production, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`**
> (Group N, stage and live production), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Atmospheric effects are what make lighting visible, and the machine is always either too small for the room or run so hard it sets off the smoke detectors. The governing relationship is that haze consumption scales with venue volume times air changes per hour, not with volume alone -- which is why the same machine that fills a small club cannot hold a hazed look in an arena with the air handlers running. Nothing in the catalog computes it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive volume, air-change rate, or reference consumption, or a reference volume or rate of zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the well-mixed-room dilution model (steady-state concentration proportional to output divided by volume times air-change rate), by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `haze-machine-sizing` -- Haze and Fog Machine Output for a Venue

```
ventilation rate  = volume x ACH
required output   = reference output x (volume x ACH) / (ref volume x ref ACH)
time constant     = 1 / ACH                    (hours to reach 63% of steady state)
time to 90%       = 2.30 / ACH
```

A hazed room is a steady state, not a fill: the machine adds haze continuously and the ventilation removes it
continuously, and the density settles where the two rates match. That makes required output proportional to the
*product* of volume and air-change rate. Double the room and you need twice the machine; leave the room the same
size and double the air handlers and you also need twice the machine. Crews consistently size on volume alone and
are then surprised that the look will not hold once the HVAC comes on for the audience.

The time constant is the other half. At 4 air changes per hour the room reaches 63% of its final density in
15 minutes and 90% in about 35 -- so a haze cue called two minutes before the top of the show does nothing, and
the machine has to have been running through the pre-show. At 1 ACH the same room takes over two hours to settle,
which is why a tight room hazes beautifully and then will not clear for the next act.

**Inputs:** venue volume (cubic ft), air changes per hour, and a reference point -- a machine's known consumption
in a known volume at a known ACH.

**Outputs:** ventilation rate (cfm), required output relative to the reference, time constant, and time to reach
90% of steady state.

## 3. Worked example

A 200,000 cubic ft hall with the air handlers at 4 ACH, scaled from a machine that holds a good haze in a
100,000 cubic ft room at 2 ACH on one quart per hour:

```
ventilation      = 200,000 x 4 / 60          = 13,333 cfm
scaling factor   = (200,000 x 4) / (100,000 x 2) = 4.0
required output  = 4 quarts per hour
time constant    = 1 / 4                     = 0.25 hr = 15 min
time to 90%      = 2.30 / 4                  = 0.58 hr = 35 min
```

Four times the fluid, for a room only twice as large -- the air handlers did half the damage. If the house will
agree to run at 2 ACH during the show, the requirement halves to two quarts an hour, and the pre-show fill takes
twice as long. That negotiation with the building engineer is worth more than a second machine.

## 4. Scope and non-goals

A well-mixed-room approximation. Real venues are not well mixed: haze stratifies with temperature, pools in still
corners, and gets swept out of the beam path by a single misaimed supply diffuser, and none of that is modeled
here. The reference point must come from the actual machine and fluid, because output per hour varies enormously
between hazers, foggers, and cracked-oil units. The tile takes no position on smoke-detector interaction, which is
a life-safety matter requiring coordination with the fire alarm contractor and the AHJ before any detector is
bypassed, or on the ventilation and material-safety requirements for the fluid itself. The venue, the fire code,
and the AHJ govern.
