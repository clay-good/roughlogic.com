# roughlogic.com Specification v1420 -- Arc-Flash Incident Energy Screen (Lee Method) (calc-elecdesign.js, Group A, electrical power systems, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, electrical power systems), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes available fault current, asymmetrical peak, and conductor withstand -- everything that leads up to an arc flash -- and then stops. The two numbers a worker needs are incident energy at the working distance and the arc-flash boundary, and the relationship that produces them shows exactly which lever matters: clearing time, linearly, and distance, squared.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive system voltage, bolted fault current, clearing time, or working distance, or an incident energy threshold at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the Ralph Lee maximum-power (open-air) incident-energy method that IEEE 1584 prescribes above 15 kV and that bounds the enclosed case, with NFPA 70E cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `arc-flash-incident-energy` -- Arc-Flash Incident Energy Screen (Lee Method)

```
E (cal/cm2) = 2.142e6 x V x I_bf x t / D^2
              V in kV, I_bf in kA, t in seconds, D in mm

arc-flash boundary = sqrt(2.142e6 x V x I_bf x t / E_threshold)
                     with E_threshold = 1.2 cal/cm2, the onset of a second-degree burn
```

The Lee method treats the arc as drawing maximum power from the source and radiating it into open air. It is the
method IEEE 1584 prescribes above 15 kV, and below that it is a conservative bound rather than a prediction --
real enclosed equipment focuses the energy forward and the empirical IEEE 1584 model, which requires equipment
class, enclosure dimensions, electrode configuration, and gap, is what an actual study uses.

What the relationship makes unmistakable is where the leverage is. Incident energy is **linear in clearing time**
and **inverse-square in distance**. Halving the clearing time -- a maintenance switch, an instantaneous setting,
a faster fuse -- halves the energy. Doubling the working distance quarters it. Raising the fault current, by
contrast, *raises* incident energy, which is why the intuition that a stiffer system is a safer system is exactly
backward at the arc flash.

**Inputs:** system voltage (kV), bolted three-phase fault current (kA), total clearing time of the upstream
protective device (s), working distance (mm or in), incident-energy threshold for the boundary.

**Outputs:** incident energy at the working distance (cal/cm2), the arc-flash boundary, and the energy at a
second clearing time or distance for comparison.

## 3. Worked example

A 480 V switchboard with 25 kA of bolted fault current, an upstream device clearing in 0.2 s, at an 18 in
(455 mm) working distance:

```
E        = 2.142e6 x 0.48 x 25 x 0.2 / 455^2 = 24.8 cal/cm2
boundary = sqrt(5,140,800 / 1.2)             = 2,070 mm = 6.8 ft
```

Twenty-five calories is past the practical limit of arc-rated clothing systems in common use, and a 6.8 ft
boundary reaches well past the equipment. Now pull the two levers. Cut the clearing time in half to 0.1 s -- one
instantaneous setting, or a maintenance switch enabled before the work -- and the energy halves to 12.4 cal/cm2.
Double the working distance to 36 in with a hot stick instead of a hand and it falls to 6.2 cal/cm2. Do both and
it is 3.1, which is an ordinary daily-wear arc-rated clothing problem instead of an energized-work-permit crisis.

## 4. Scope and non-goals

**A screen, never a label.** Arc-flash labeling is an engineering study: it requires a complete short-circuit
study, a coordination study with the actual device time-current curves and their real clearing times at the
arcing current -- not the bolted current -- and the IEEE 1584-2018 empirical model with equipment class, electrode
configuration, gap, and enclosure size. This tile uses none of that. The Lee method is conservative in open air
and can be substantially *non*-conservative for enclosed equipment at low voltage. Arcing current is lower than
bolted current, which lengthens clearing time and often raises incident energy -- a second-order effect this
screen ignores entirely and one that regularly doubles the answer. Do not select PPE from this tile, and do not
put its number on a label. NFPA 70E, IEEE 1584, a qualified engineer's study, and the employer's electrical safety
program govern.
