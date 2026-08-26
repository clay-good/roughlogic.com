# roughlogic.com Specification v1435 -- Pneumatic Cylinder Air Consumption (SCFM) (calc-shop.js, Group G, shop and industrial, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-shop.js`**
> (Group G, shop and industrial), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog sizes an air receiver and corrects between ACFM and SCFM but never computes the demand that drives both: what a pneumatic cylinder actually consumes. The answer is not the cylinder's swept volume -- it is that volume times the compression ratio at the operating pressure, and forgetting the compression ratio understates the demand by a factor of seven at ordinary shop pressure.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive bore, stroke, or cycle rate, a rod diameter at or above the bore, or an operating pressure at or below zero gauge, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): the free-air-consumption relation (swept volume times cycle rate times compression ratio) with compression ratio taken as absolute operating pressure over standard atmospheric pressure, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `pneumatic-cylinder-scfm` -- Pneumatic Cylinder Air Consumption (SCFM)

```
extend volume    = pi (bore/2)^2 x stroke
retract volume   = (pi (bore/2)^2 - pi (rod/2)^2) x stroke
volume per cycle = extend + retract, converted to cubic feet
compression ratio= (gauge pressure + 14.7) / 14.7
SCFM             = volume per cycle x cycles per minute x compression ratio
```

Compressed air is billed in *standard* cubic feet -- free air at atmospheric pressure -- and a cylinder is filled
with *compressed* air. Every cubic foot of cylinder volume at 90 psig took just over seven cubic feet of free air
to fill, and every cycle throws all of it away through the exhaust port. That factor of seven is the whole reason
pneumatics are expensive to run and the reason a shop's compressor is always smaller than its air demand.

The rod side matters and is easy to skip. On the retract stroke the rod occupies part of the bore, so the retract
volume is smaller than the extend volume -- and on a large-rod cylinder that difference is substantial. Counting
both strokes at full bore over-estimates; counting only the extend stroke under-estimates by nearly half.

**Inputs:** bore diameter, rod diameter, stroke, cycles per minute, operating gauge pressure, number of cylinders.

**Outputs:** extend and retract volumes, volume per cycle, compression ratio, SCFM per cylinder and for the set,
and the compressor horsepower the demand implies at a stated specific power.

## 3. Worked example

A 2.5 in bore, 1.0 in rod, 12 in stroke cylinder cycling 20 times a minute at 90 psig:

```
extend volume    = pi x 1.25^2 x 12         = 58.90 cubic in
retract volume   = (4.909 - 0.785) x 12     = 49.48 cubic in
per cycle        = 108.38 cubic in          = 0.0627 cubic ft
compression ratio= 104.7 / 14.7             = 7.12
SCFM             = 0.0627 x 20 x 7.12       = 8.93 SCFM
```

Nine SCFM from one small cylinder -- roughly two horsepower of compressor, continuously, for a two-and-a-half inch
bore. Ten such cylinders is a 20 hp compressor doing nothing but cycling actuators. And the pressure lever is
real: dropping the supply from 90 psig to 70 psig cuts the compression ratio to 5.76 and the consumption to 7.23
SCFM, a 19% reduction, if the application will still make its force at the lower pressure.

## 4. Scope and non-goals

The cylinder only. It does not include the air in the lines, fittings, and valve between the valve and the
cylinder, which is filled and dumped every cycle and on a long run can exceed the cylinder's own volume -- one of
the best reasons to mount valves at the actuator. It does not account for leakage, which in a typical shop is 20%
to 30% of total compressed air production and is usually the single largest consumer in the building. It does not
size a compressor, a receiver, or the piping, and it does not check whether the cylinder makes the required force
at the operating pressure, which is a separate calculation. The component manufacturer's data governs.
