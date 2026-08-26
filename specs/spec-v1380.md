# roughlogic.com Specification v1380 -- Air Brake Pushrod Stroke and Out-of-Service Screen (calc-trucking.js, Group J, trucking and logistics, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** Brakes out of adjustment are among the most-cited defects at roadside inspection, and the rule has two parts nobody keeps straight: a per-brake readjustment limit that depends on the chamber type and size, and a vehicle-level threshold at which the defective count puts the whole combination out of service. Neither is in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive measured stroke, chamber size, or brake count, or a defective count greater than the total brake count, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): 49 CFR 393.47 (brake adjustment) and the CVSA North American Standard out-of-service criteria for defective brakes, cited by section and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `air-brake-pushrod-stroke` -- Air Brake Pushrod Stroke and Out-of-Service Screen

```
per brake:   defective when measured stroke >= readjustment limit for that chamber
vehicle:     defective fraction = defective brakes / total brakes
             out of service when defective fraction >= 20%
margin:      readjustment limit - measured stroke
```

Each brake chamber has a published readjustment limit -- a stroke at which the brake is considered out of
adjustment -- and it depends on the chamber type and size, not on the vehicle. A standard type 30 clamp chamber
sits at 2 inches; a long-stroke type 30 at 2.5 inches. Being *at* the limit counts as defective, not just being
over it, which is the detail that turns a marginal brake into a violation.

The vehicle-level rule is the one that decides whether the truck moves. When 20% or more of the combination's
brakes are defective, the whole vehicle is out of service. On a five-axle combination with ten brakes, two
defective brakes is exactly 20% -- so a driver who finds one out of adjustment is one brake away from being
parked, and that is the number worth knowing before the inspection, not during it.

**Inputs:** chamber type and size with its readjustment limit, measured stroke for each brake, and total brake
count on the combination.

**Outputs:** per-brake margin to the readjustment limit, count of defective brakes, defective fraction, and the
out-of-service determination.

## 3. Worked example

A five-axle combination -- ten brakes -- with three brakes measuring at or past their readjustment limit:

```
defective fraction = 3 / 10 = 30%
30% >= 20%          -> OUT OF SERVICE
```

The truck does not move until they are adjusted. Note how little slack there is: with two defective the fraction
is exactly 20% and the result is the same. Only at one defective brake -- 10% -- is the combination legal to
operate, and it is a violation on the inspection report either way.

## 4. Scope and non-goals

An adjustment screen, not a brake inspection. Readjustment limits vary by chamber type and size and must be taken
from the table in 393.47 for the specific chamber; the numbers mentioned here are illustrative. Stroke must be
measured correctly -- at a fully charged system with the brakes applied at the specified pressure and, for the
applied-stroke method, with the engine off -- and a stroke measured any other way means nothing. The tile does not
evaluate lining thickness, drum condition, air loss rate, slack adjuster condition, ABS faults, or any of the many
other brake defects that carry their own out-of-service criteria, several of which put a vehicle out on a single
occurrence. FMCSA, CVSA, and the roadside inspector govern.
