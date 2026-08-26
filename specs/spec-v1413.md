# roughlogic.com Specification v1413 -- TXV Capacity Correction and Valve Sizing (calc-refrigerant.js, Group C, HVAC and refrigeration service, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-refrigerant.js`**
> (Group C, HVAC and refrigeration service), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes superheat and subcooling and refrigerant line sizing but never checks whether the expansion valve is the right size for the coil. A TXV's stamped tonnage is a rating-point number, and the two corrections that turn it into installed capacity -- liquid temperature and the actual pressure drop across the valve -- are exactly the two conditions that are never at the rating point.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive nominal capacity, pressure drop, or evaporator load, a rated pressure drop of zero, or a liquid temperature outside a plausible range, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the TXV capacity correction convention (a liquid-temperature factor and a square-root pressure-drop factor applied to the rated tonnage) and the standard 100 to 130 percent valve-to-load sizing window, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `txv-capacity-check` -- TXV Capacity Correction and Valve Sizing

```
pressure-drop factor = sqrt(actual dP across the valve / rated dP)
installed capacity   = nominal tonnage x liquid-temperature factor x pressure-drop factor
sizing ratio         = installed capacity / evaporator load
target window        = 100% to 130% of load
```

A thermostatic expansion valve is an orifice, so its flow follows the square root of the pressure difference
across it -- and the pressure difference is the *net* one, condensing pressure less evaporating pressure less the
distributor and line losses, not the system's head pressure. A valve rated at 100 psi of drop passes 10% more at
120 psi and 30% less at 50 psi.

The liquid-temperature factor is the second correction and it runs the other way from intuition. Colder, more
subcooled liquid entering the valve has more refrigerating effect per pound, so the valve delivers *more* tons for
the same mass flow. A valve rated at 100 F liquid gains capacity at 90 F and loses it at 110 F.

The sizing window is what the corrections are for. A valve under 100% of load starves the coil at design
conditions -- high superheat, low capacity, and a compressor that never satisfies. A valve much over 130% hunts:
it overfeeds, floods back, closes, starves, and cycles, and the symptom looks like a bad bulb rather than a
sizing error.

**Inputs:** nominal valve tonnage and its rating conditions, actual pressure drop across the valve, actual liquid
temperature at the valve, liquid-temperature correction factor, evaporator design load.

**Outputs:** pressure-drop factor, installed capacity, sizing ratio against the load, and whether the valve falls
in the window.

## 3. Worked example

A 3-ton nominal TXV rated at 100 psi of drop and 100 F liquid, installed where the actual drop is 120 psi and the
liquid arrives at 90 F (correction factor 1.07), on a 3-ton coil:

```
pressure factor   = sqrt(120/100)          = 1.095
installed capacity= 3.0 x 1.07 x 1.095     = 3.52 tons
sizing ratio      = 3.52 / 3.0             = 117%   -> inside the window
```

Comfortable. Now put the same valve on a low-ambient day when head pressure falls and the drop across the valve
collapses to 50 psi: the pressure factor becomes `sqrt(0.5) = 0.707`, installed capacity falls to 2.27 tons, and
the valve is at 76% of load -- it starves the coil, superheat climbs, and capacity is lost. That is precisely why
head-pressure control exists on systems that run in winter, and it is a valve problem before it is a compressor
problem.

## 4. Scope and non-goals

Capacity arithmetic against manufacturer ratings. Liquid-temperature correction factors, rating conditions, and
the sizing window are the valve manufacturer's data and vary by valve series and refrigerant -- take them from the
catalog sheet, not from a remembered figure. The tile does not select a valve, choose a bulb charge or an
external-equalizer arrangement, evaluate the distributor and nozzle, or diagnose a hunting valve, which has as
many causes as sizing. It does not compute the actual pressure drop across the valve, which requires knowing the
line, distributor, and coil losses. The valve manufacturer's data and the equipment manufacturer govern.
