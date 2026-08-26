# roughlogic.com Specification v1390 -- Sprinkler Obstruction Clearance (Three Times Rule) (calc-fire.js, Group F, fire-ground and fire protection, 1 New Tile)

> **Status: PROPOSED (2026-08-26). Single-tile spec.** Part of [scope-trade-expansion](scope-trade-expansion.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground and fire protection), no new module or dependency. Inherits spec.md through spec-v1349.md.
>
> **The gap.** The catalog lays out sprinkler head count and spacing but never checks what is under the head. Obstruction rules are where sprinkler plans fail plan review most often, and the governing one -- keep the sprinkler at least three times the obstruction's width away, up to a cap -- is a single multiplication that no tile performs.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21
contract: a non-positive obstruction width or separation distance, or a negative deflector offset, returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline (v19/v22): NFPA 13 obstruction-to-sprinkler-discharge rules for standard spray sprinklers, including the three-times-width rule and its 24 in cap, cited by number and linked, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `sprinkler-obstruction` -- Sprinkler Obstruction Clearance (Three Times Rule)

```
required separation = min(3 x obstruction width, 24 in)
deficiency          = required separation - actual horizontal separation
alternative         = position the deflector at or above the obstruction's bottom, or add a sprinkler below
```

A standard spray sprinkler throws its water outward and downward from the deflector, and anything hanging in that
pattern casts a dry shadow behind it. NFPA 13's general rule for an obstruction against a wall or in the pattern
is to keep the sprinkler horizontally away by at least three times the obstruction's width, capped at 24 inches --
past two feet of width, the three-times rule stops growing and a different provision takes over.

The rule is a screen with three outcomes, and reporting all three is the point of the tile. Either the sprinkler
is far enough away, or it can be moved, or -- when it can be neither, which is the common case with a wide duct
or a continuous obstruction -- the answer is a sprinkler underneath, which is a design change and a hydraulic
change, not a field adjustment. Finding that out at rough-in is a great deal cheaper than finding it out at
inspection.

**Inputs:** obstruction width (in), horizontal distance from the sprinkler to the near edge of the obstruction
(in), obstruction depth below the deflector (in), sprinkler type.

**Outputs:** required separation, deficiency if any, pass or fail, and the applicable remedy.

## 3. Worked example

A 12 in wide duct running 8 in below the ceiling, with the nearest sprinkler 24 in away horizontally:

```
required = min(3 x 12, 24) = min(36, 24) = 24 in
actual   = 24 in                         -> meets the requirement, with nothing to spare
```

Exactly at the limit. Widen the duct to 18 in and the requirement stays at 24 in because of the cap, so the same
sprinkler still passes -- which is counterintuitive and is precisely why the cap exists. But narrow the separation
to 18 in, or hang a second duct that pushes the sprinkler closer, and the head is deficient by 6 in and either
moves or gains a sprinkler below it.

## 4. Scope and non-goals

One general rule, for standard spray sprinklers. NFPA 13 contains many obstruction provisions -- separate rules
for obstructions against walls, for isolated obstructions, for continuous obstructions, for ceiling-mounted and
suspended obstructions, and entirely different rules for extended coverage, sidewall, residential, ESFR, and
storage sprinklers, where ESFR clearances in particular are far more restrictive. The tile does not determine
which provision applies, does not handle the deflector-position-below-obstruction alternative dimensionally, and
does not evaluate obstructions to storage or to the sprinkler's activation. Sprinkler system design is stamped
work. NFPA 13 as adopted, the designer of record, and the AHJ govern.
