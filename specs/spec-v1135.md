# roughlogic.com Specification v1135 -- Vent Terminal Check (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-plumbing.js`** (Group B), no new module, group, or dependency. Inherits spec.md through
> spec-v1134.md.
>
> **The gap.** A dupe scan for "vent through roof" returned zero hits. The catalog sizes drainage and
> vents by fixture units but never checked where the terminal is allowed to end up.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
height or diameter, a negative snow depth, increase depth, or distance, or a non-finite design temperature
return `{ error }`. Hand-written renderer, matching this module's convention.
`check-module-sizes` cap for calc-plumbing.js raised 76000 -> 84000 (the module had reached 95.0%).

## 2. The tile

### 2.1 `vent-terminal-check` -- Vent Terminal Height, Frost Closure, and Location (IPC 903)

```
inputs:  height_above_roof_in, snow_accumulation_in, roof_other_use, design_temp_f,
         vent_diameter_in, increase_inside_envelope_in, horizontal_to_opening_ft,
         height_above_opening_ft
compute: 903.1   required height = 84 in if the roof is in use, else max(6, snow + 6)
         903.1.1 if design temp <= 0 degF: diameter >= 3 in AND increase >= 12 in inside
                 the thermal envelope
         903.2   horizontal >= 10 ft OR height above the opening >= 3 ft
outputs: required_height_in, height_ok, height_deficit_in, snow_governs, other_use,
         frost_zone, min_diameter_in, min_increase_depth_in, diameter_ok, increase_ok,
         needs_increase, frost_ok, clears_horizontally, clears_vertically, location_ok,
         passes, note
```

**Three independent rules, one pipe.** A plumber can satisfy any two and still fail, which is exactly why
they belong in one check. The default example fails all three at once, and the cross-check fixture fixes
all three.

**Snow is the clause that moves the height.** The rule is 6 in above the roof *or* 6 in above the
**anticipated** snow accumulation, whichever is greater -- so 18 in of snow makes the requirement 24 in,
and the 6 in everyone remembers is only the floor. A roof used for any purpose other than weather
protection jumps to **7 ft**, an order-of-magnitude change a deck or mechanical platform quietly triggers.

**The frost rule has a second half people miss.** Everyone knows the 3-in diameter. Fewer know the
increase must be made at least **1 ft inside the thermal envelope** -- a fitting made up in a cold attic
frosts shut exactly like the small pipe it replaced. The fuzzer pins that a correct 3-in terminal with an
11.9-in increaser is still non-compliant.

**The 3-ft allowance is an alternative, not an addition.** A terminal inside 10 ft horizontally complies
by going 3 ft above the opening, and the cross-check fixture passes on exactly that path. The note also
flags what surprises people on a tight lot: the section says this building **or an adjacent one**, so the
neighbour's windows count as much as your own.

## 3. Scope

Snow accumulation and the 97.5% design temperature are local figures -- the code says *anticipated*, not a
national number. Not checked: the vent **size** from drainage fixture units and developed length, whether
a vent is required at all, the branch below, roof flashing and the sleeve, wall terminations and their own
separations, or combustion and fuel-gas venting, which is a different chapter entirely.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `fixture-clearance-check`,
`plumbing-fixture-count`, and `roofing-squares`. Fuzzer pins both fixtures, the snow-governs rule across
four depths, that a roof in use overrides snow, the height seam, the frost trigger at exactly 0 degF and
that both frost conditions are required, that the frost rule returns `null` rather than a verdict above
0 degF, the location rule across 25 combinations with both seams exact, that the three rules stay
independent, that fixing any single rule is still a failure, and every error seam.
