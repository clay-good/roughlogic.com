# roughlogic.com Specification v1420 -- Ground Grid Conductor Sizing for Fault Current (IEEE 80) (calc-elecdesign.js, Group A, electrical power systems, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, electrical power systems), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog carries three IEEE 80 tiles -- tolerable step and touch voltage, ground potential rise, and the maximum grid resistance -- and none of them sizes the conductor that has to survive the fault. That is the one thermal calculation in a grounding study, and it is what decides whether a grid conductor melts at its joints on the day it is finally called on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive fault current, fault duration, or material constant, or a computed area at or below zero returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the IEEE 80 ground-conductor thermal sizing relation A_kcmil = I x Kf x sqrt(tc) with the published Kf values by conductor material and joint fusing temperature, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `grounding-grid-conductor` -- Ground Grid Conductor Sizing for Fault Current (IEEE 80)

```
A (kcmil) = I (kA) x Kf x sqrt(tc)

  I   symmetrical fault current through the conductor, in kiloamperes
  tc  fault duration in seconds
  Kf  material and temperature-limit constant from IEEE 80
      annealed soft-drawn copper, 1,083 C fusing:  Kf about 7.00
      commercial hard-drawn copper, brazed joints: Kf about 7.06
      copper-clad steel:                           Kf about 14.6
      steel:                                       Kf about 15.9
```

The conductor has to carry the fault long enough for protection to clear it without reaching a temperature that
damages it or, worse, its joints. `Kf` encodes the material's thermal capacity and its temperature limit, and the
limit is set by the **joint**, not by the conductor: a bolted or pressure connection has to be held far below the
conductor's fusing point, while an exothermic or brazed connection can go much higher, which is why the same
copper gets a different constant depending on how it is joined.

Two properties of the relation matter in practice. It scales with the **square root of time**, so a fault that
clears in a quarter of the time needs only half the conductor -- protection speed is a real substitute for copper.
And it scales **linearly with current**, so a system with high available fault current needs proportionally more
conductor everywhere in the grid.

The thermal answer is usually not the answer that gets installed. Grid conductors are almost always upsized well
beyond the thermal minimum for mechanical strength during installation and for corrosion allowance over a
decades-long buried life, which is why 4/0 copper is a common grid conductor on systems whose thermal requirement
is a fraction of it.

**Inputs:** symmetrical fault current through the conductor (kA), fault duration (s), conductor material and joint
type with its Kf, and any decrement factor for DC offset.

**Outputs:** required area in kcmil and the nearest standard AWG or kcmil size, the area at a second clearing
time for comparison, and the mechanical-minimum advisory.

## 3. Worked example

A grid conductor carrying 12 kA for 0.5 s:

```
copper, brazed joints (Kf = 7.00): A = 12 x 7.00 x sqrt(0.5) = 59.4 kcmil   -> #2 AWG (66.4 kcmil) thermally
steel               (Kf = 15.9):   A = 12 x 15.9 x sqrt(0.5) = 135.3 kcmil  -> 3/0 thermally
```

Copper needs less than half a steel conductor's area for the same duty, which is most of the reason grids are
copper. But #2 is not what anyone installs: a buried grid conductor is handled, tamped over, and expected to last
forty years in soil, so 4/0 copper is the common practical minimum and the thermal calculation is the *floor*,
not the specification.

Now halve the clearing time to 0.25 s: the copper requirement falls to 42.0 kcmil, a 29% reduction from the square
root. Faster protection is the cheapest grounding conductor there is.

## 4. Scope and non-goals

One conductor, one thermal check. It does not perform a grounding study: grid geometry and spacing, soil
resistivity and its layering, grid resistance, ground potential rise, mesh and step voltages, the split of fault
current between the grid and the overhead shield wires and neutrals, and the decrement factor for DC offset are
all part of that study and all affect the answer. The fault current used must be the portion actually flowing in
the conductor being checked, which is generally not the total system fault current. Kf values must be taken from
the IEEE 80 tables for the specific material, joint type, and ambient. Grounding system design for a substation
or a generating facility is stamped engineering. IEEE 80, a qualified engineer, and the AHJ govern.
