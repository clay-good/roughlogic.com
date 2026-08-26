# roughlogic.com Specification v1447 -- Airless Spray Tip Size, Fan Width, Output, and Coverage Rate (calc-finish.js, Group E, finish trades, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`**
> (Group E, finish trades), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog computes paint coverage by area but nothing about how the paint gets on the wall. An airless tip number encodes two things -- fan width and orifice size -- and from the orifice, the pressure, and the target film build come the flow rate, the coverage rate, and the travel speed the sprayer has to move at. None of it is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive orifice size, pressure, or wet film thickness, or a fan width at or below zero, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the airless tip numbering convention (first digit times two is the fan width in inches at a 12 inch distance, the last two digits are the orifice in thousandths), the orifice flow relation Q proportional to d^2 sqrt(P), and the 1,604 sq ft per gallon per mil wet-film constant, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `spray-tip-selection` -- Airless Spray Tip Size, Fan Width, Output, and Coverage Rate

```
tip number "517": fan width = 5 x 2 = 10 in at 12 in from the surface
                  orifice   = 0.017 in

flow (gpm)       = k x orifice^2 x sqrt(pressure)      k calibrated to a known tip
coverage rate    = flow x 1,604 / wet film mils         sq ft per minute
travel speed     = coverage rate / (fan width in feet)  feet per minute
```

The tip number is two facts in three digits, and both matter. **Fan width** is the first digit doubled, and it
should be matched to the work -- a wide fan on a narrow surface wastes most of the material, and a narrow fan on
a wall is slow. **Orifice** is the last two digits in thousandths, and it sets flow, which goes as the *square*
of the orifice: a .021 tip passes nearly twice what a .015 does at the same pressure. Orifice also has to be
matched to the coating's viscosity, which is why a lacquer tip will not spray block filler.

Pressure is the weaker lever, entering as a square root -- raising pressure from 2,000 to 2,500 psi increases flow
by only 12%, while dramatically increasing overspray and tip wear. When a fan is not atomizing, the fix is
usually a smaller tip or a thinner coating, not more pressure.

The last two lines are the ones that connect to the wall. One gallon spread one mil thick wet covers 1,604 square
feet, so the coverage rate and the travel speed follow directly -- and the travel speed is the reality check. If
the arithmetic says the gun must move faster than a person can walk, the tip is too large for the target film
build.

**Inputs:** tip number (or fan width and orifice directly), spray pressure, target wet film thickness, and a
known reference tip flow for calibration.

**Outputs:** fan width, orifice, flow in gpm, coverage rate in sq ft per minute, required travel speed, and
gallons per hour of continuous spraying.

## 3. Worked example

A 517 tip at 2,000 psi, laying 6 wet mils, calibrated against a .015 tip flowing 0.31 gpm at 2,000 psi:

```
fan width     = 5 x 2                     = 10 in = 0.83 ft
orifice       = 0.017 in
flow          = 0.31 x (0.017/0.015)^2    = 0.398 gpm
coverage rate = 0.398 x 1,604 / 6         = 106 sq ft per minute
travel speed  = 106 / 0.83                = 128 ft per minute
```

A hundred and six square feet a minute is why airless exists, and 128 feet per minute -- about a foot and a half
per second -- is a brisk but entirely normal gun speed. Now try to build the same 6 mils with a .021 tip: flow
goes to 0.61 gpm, coverage rate to 162 sq ft/min, and the required travel speed to 195 ft/min, which is faster
than most people can move a gun smoothly. That tip wants a heavier film or a wider fan, and forcing it produces
runs.

## 4. Scope and non-goals

Tip arithmetic. The flow relation needs a calibration point from the manufacturer's own tip chart; the constant is
not universal across tip designs and it drifts as the tip wears -- a worn tip passes more material through a
narrower fan, which is the classic cause of runs and stripes and is not detectable except by measuring. Wet film
thickness is measured with a gauge, and the dry film that a specification calls for depends on the coating's
volume solids, which this tile does not convert. It does not address overlap technique, the trigger and stroke
discipline that determine actual film uniformity, thinning, or coating-specific tip recommendations. **It takes
no position on the safety requirements of airless spraying**, where fluid injection injuries from a tip at
thousands of psi are a surgical emergency, or on respiratory protection and ventilation. The coating and sprayer
manufacturers govern.
