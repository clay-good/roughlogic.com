# roughlogic.com Specification v1843 -- Microduct Fill Ratio and Cable Jetting Air (`calc-telecom.js`, Group A Electrical, fiber optic outside plant, 1 New Tile)

> **Status: PROPOSED (2026-09-11). Single-tile spec.** Part of [scope-trade-expansion-3](scope-trade-expansion-3.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-telecom.js`**
> (Group A Electrical, hub `/groups/electrical/`), no new dependency and no new network call. Inherits spec.md through spec-v1749.md.
>
> **The gap.** Blowing a cable into a microduct works by air dragging on the cable's whole surface, so the annulus around it is the machine. Too tight and it binds, too loose and it needs a compressor nobody brought.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive duct or cable diameter, a cable diameter at or above the duct inside diameter, or a non-positive air velocity or pressure returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the area fill ratio convention and published jetting fill windows with the cable and duct manufacturers' jetting data and a trial shot named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`microduct fill ratio`, `cable jetting air flow`, `fiber blowing duct sizing`, `cable to duct diameter ratio`, `jetting distance microduct`.

## 2. The tile

### 2.1 `cable-jetting-distance` -- Microduct Fill Ratio and Cable Jetting Air

```
fill ratio       (cable OD / duct ID)^2, the AREA fraction the cable occupies
the window       roughly 40 to 60% area fill jets best; above it the cable binds
                 and below it there is too little air velocity over the cable
annulus          the flow area: pi/4 x (duct ID^2 - cable OD^2)
air flow         annulus area x air velocity, at duct pressure
free air         multiply by the absolute pressure ratio; a compressor is rated in
                 free air delivered, not air at duct pressure
the mechanism    air drag distributed along the WHOLE cable, not a pull at the
                 end -- which is why jetting reaches far further than pulling
                 (`pulling-tension` is the pulled case)
bends            each bend consumes distance; the manufacturer's jetting chart
                 derates for them and there is no general formula
distance         established by the cable and duct makers' jetting data for the
                 specific pair, verified by trial
```

Jetting is not pulling with air and the distinction is the whole reason the technique exists. A pulled cable
takes its entire tension at the rope, so friction accumulates along the run and the tension at the pulling end
grows until the cable's limit is reached. A jetted cable is pushed along its entire length at once by air
moving over its surface, so the force is distributed and the accumulated friction never lands in one place.
That is why jetted runs reach distances a pull cannot approach.

The fill ratio has a window rather than a maximum, which surprises people who think of it as a clearance
problem. A cable too large for its duct binds on the bends and there is no annulus left for air to move
through. A cable too small sits in a large duct where the air races past without gripping it, and the
distributed force that does the work is proportional to the cable's surface and the air's velocity over it.
Between those is a band where the technique works well, and duct and cable are selected as a pair to land in
it.

Air is the consumable and it is usually what limits a job on site. The annulus sets how much air the duct will
pass, the compressor has to deliver it as free air at the pressure required, and the requirement rises as the
duct gets larger relative to the cable. A crew that arrives with a compressor sized for one duct and cable
combination and is handed another can find itself unable to jet at all, which is a scheduling problem rather
than an engineering one and is entirely predictable in advance.

**Inputs:** the duct inside diameter, the cable outside diameter, the recommended fill window, the air velocity, and the operating pressure

**Outputs:** the area fill ratio and whether it falls in the window, the cable diameter that would give an optimal fill, the annulus area, the air flow at duct pressure and as free air, and the same figures for an optimally sized cable

## 3. Worked example

An 8.5 mm cable in a 10 mm inside diameter microduct:

```
fill = (8.5 / 10)^2 = 72.2%
```

**72% is well above the 40% to 60% window.** The cable will bind on the bends and there is very little
annulus left to move air through:

```
annulus = pi/4 x (10^2 - 8.5^2) = 21.8 mm^2
air at 25 m/s = 33 L/min at duct pressure
free air at 10 bar absolute = 327 L/min
```

**An optimally sized cable for this duct is smaller:**

```
OD for 50% fill = 10 x sqrt(0.50) = 7.07 mm
```

**A 7.0 mm cable lands at 49% fill**, inside the window, and it changes the air requirement:

```
annulus = 40.1 mm^2
air     = 60 L/min at pressure, 601 L/min free air
```

**84 percent more air for the better-sized cable.** That is the trade: the tighter cable needs a smaller
compressor and will not jet; **the correctly sized one jets and needs 274 L/min more free air.** A crew
arriving with a compressor sized for the wrong pair finds out at the duct.

**And note what is NOT computable here.** The distance a given cable will jet into a given duct comes from the
manufacturers' jetting data for that specific pair, derated for the bends on the actual route, and verified by
trial. **There is no general formula for jetting distance**, because the force is distributed along the cable
in a way that depends on the duct's whole geometry -- which is also exactly why it beats pulling
(`pulling-tension`), where the tension accumulates at one end and the cable's limit is reached.

## 4. Scope and non-goals

A sizing screen. Jetting distance is not calculable from first principles and is not attempted here: it depends on the specific cable and duct pair's surface characteristics, the cable's stiffness and weight, the duct's internal profile and any lubricant or low-friction lining, the number and radius of bends and their distribution along the route, elevation change, temperature, and the jetting machine itself, and the manufacturers' published jetting data for the pair, verified by a trial shot, is the only source. The fill window is a practice range and the manufacturers state their own. Air flow here is a simple annulus calculation at a nominal velocity and is not a compressible flow analysis; real duct flow is compressible, the pressure falls along the duct, and the velocity varies with it, so the compressor requirement should come from the jetting equipment supplier rather than from this arithmetic. It does not address duct pressure testing and proofing, duct coupling and sealing, rodding, lubricants, mid-assist and cascade techniques for long runs, or the figure-eight and re-jet method. It does not address the cable's crush, tension, and bend radius limits (`cable-bend-radius`). The cable and duct manufacturers' jetting data, the jetting equipment supplier's air requirements, and a trial shot on the actual route govern.
