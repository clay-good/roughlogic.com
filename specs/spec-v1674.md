# roughlogic.com Specification v1674 -- Post-Weld Heat Treatment Holding Time and Rate (`calc-inspection.js`, Group E Carpentry and Construction, metallurgy, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-inspection.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; heat treatment and metallurgy), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** Post-weld heat treatment holds a joint at temperature to relieve residual stress, and the code gives the time as a rate per inch of thickness with heating and cooling rates bounded on either side. Exceeding the rates is as much a deviation as missing the hold.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive thickness or holding time, or a heating or cooling rate exceeding the entered limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the code holding time and ramp rate conventions with ASME and AWS named as governing the specific values, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`pwht holding time`, `post weld heat treatment rate`, `stress relief hour per inch`, `pwht heating cooling rate`, `soak band thermocouple`.

## 2. The tile

### 2.1 `pwht-holding-time` -- Post-Weld Heat Treatment Holding Time and Rate

```
holding time      commonly 1 hour per inch of thickness, with a stated minimum
                  the applicable code gives the rate and the minimum
holding temperature by material group; carbon steel commonly around 1,100 to 1,200 degF
heating rate      limited above a threshold temperature, commonly 400 degF per hour
                  divided by the thickness in inches, with a ceiling
cooling rate      similarly limited; below a threshold the part may cool in still air
thickness         the governing thickness is defined by the code, and for a joint between
                  unequal thicknesses it is not simply the thicker one
soak uniformity   the whole heated band must be within a temperature tolerance
```

The rates matter as much as the hold and they are the part most often violated. Heating and cooling too quickly
puts thermal gradients into the part that can introduce stress rather than relieve it, and on a thick section
those gradients are exactly what the treatment exists to remove. That is why the permitted rate is inversely
proportional to thickness: a thin part can be brought up quickly, a thick one cannot.

The governing thickness is a code definition rather than a measurement. For a joint between components of
different thickness, and for various joint configurations, the code specifies which dimension controls -- and it
is not always the thicker member. Using the wrong dimension gives the wrong hold time and, on the rate side, the
wrong ramp.

Uniformity across the heated band is the requirement that field PWHT most often struggles with. A local heat
treatment on a pipe joint has to hold the whole soak band within tolerance and provide a graded band beyond it,
with enough thermocouples to demonstrate it -- and a joint that reached temperature at one thermocouple and not
at another has not been heat treated, whatever the chart says.

**Inputs:** the governing thickness, the code holding time rate and minimum, the holding temperature range, the heating and cooling rate limits and their threshold temperature, and the number and placement of thermocouples

**Outputs:** the required holding time for the entered thickness, the maximum heating and cooling rates above the threshold temperature, the minimum total cycle time, the cycle time at an alternative thickness, and a flag where an entered rate exceeds the limit

## 3. Worked example

A 2.0 in thick carbon steel weld requiring PWHT at 1,150 degF, at 1 hour per inch:

```
holding time = 2.0 x 1.0 = 2.0 hours
```

Two hours at temperature. The rates:

```
maximum heating rate above 800 degF = 400 / 2.0 = 200 degF per hour
maximum cooling rate above 800 degF = 500 / 2.0 = 250 degF per hour
```

Heating from 800 to 1,150 degF at 200 degF/h takes `350 / 200` = 1.75 hours, and the
controlled cooling back down takes `350 / 250` = 1.40 hours. **The full cycle is
5.2 hours**, not the 2 hour hold -- which is what a schedule has to allow.

Now a 4 in section:

```
holding time  = 4.0 hours
heating rate  = 400 / 4 = 100 degF/h -> 3.5 hours to come up from 800
cooling rate  = 500 / 4 = 125 degF/h -> 2.8 hours to come down
full cycle                            = 10.3 hours
```

Twice the thickness is **more than five times the cycle time**, because the hold doubles and both ramps halve in
rate. That is the scheduling fact behind field PWHT on heavy wall.

The uniformity requirement underneath it: the whole soak band has to be within tolerance, demonstrated by
thermocouples placed per the procedure. A single control thermocouple on a large joint does not establish it.

## 4. Scope and non-goals

A time and rate calculation using code values the user supplies. Holding temperatures and times, the rate
limits and their threshold temperature, the definition of governing thickness, the soak and graded band widths,
and the thermocouple requirements are set by the applicable construction code -- ASME Section VIII, B31.1, B31.3,
AWS D1.1, and others differ from each other -- and the governing code's provisions must be used rather than the
common values above. It does not determine whether PWHT is required, which depends on material, thickness,
service, and the code, or address the exemptions and alternatives such as controlled deposition welding. It does
not address the material property changes PWHT causes: some materials lose strength or toughness on prolonged or
repeated PWHT, and the accumulated time across multiple cycles is limited. It does not address bolting, cladding,
or attachments within the heated band. The governing construction code, the written PWHT procedure, and the
authorized inspector govern.
