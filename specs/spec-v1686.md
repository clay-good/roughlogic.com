# roughlogic.com Specification v1686 -- Scaffold Tie Spacing and Height-to-Base Ratio (`calc-construction.js`, Group E Carpentry and Construction, scaffold, 1 New Tile)

> **Status: PROPOSED (2026-09-05). Single-tile spec.** Part of [scope-trade-expansion-2](scope-trade-expansion-2.md).
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`**
> (Group E, Carpentry and Construction -- the existing category, hub `/groups/construction/`; scaffold and shoring), no new dependency and no new network call. Inherits spec.md through spec-v1449.md.
>
> **The gap.** A free-standing scaffold is stable only up to a height-to-base ratio, and above it the scaffold has to be tied to the structure. The ratio is a simple division and the tie spacing above it is a manufacturer and code requirement -- and it is what stops a scaffold from folding over.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer signoff apply. The v18/v21
contract: a non-positive height or base dimension, or a tie spacing exceeding the entered limit returns `{ error }`; no numeric field is ever `Infinity`. Citation discipline
(v19/v22): the height-to-base stability ratio with OSHA 1926 Subpart L and the manufacturer instructions named as governing, GOVERNANCE.general.

The three doors are inherited, not rebuilt: the website through `renderToolView`, the local MCP server through
the shared registries, and the **Report a problem** control through the one shared report path. Aliases:
`scaffold height to base ratio`, `scaffold tie spacing`, `4 to 1 scaffold rule`, `scaffold outrigger stability`, `sheeted scaffold wind ties`.

## 2. The tile

### 2.1 `scaffold-tie-spacing` -- Scaffold Tie Spacing and Height-to-Base Ratio

```
height to base    ratio = height / minimum base dimension
free standing     commonly limited to 4:1 without ties or outriggers
                  outriggers widen the base and raise the allowable height
tie spacing       vertically at defined intervals and horizontally along the run,
                  per the manufacturer and OSHA
first tie         at or below the height where the 4:1 ratio is reached
tie capacity      each tie must resist a lateral load; a tie to a window frame or a
                  gutter is not a tie
wind              increases the demand substantially, especially on sheeted scaffold
```

The 4:1 ratio is the threshold rather than a design: it is the point at which a scaffold can no longer be
relied on to stand on its own, and everything above it depends on ties. The first tie therefore goes at or below
that height, and a scaffold erected past 4:1 with the first tie somewhere higher has an unbraced length below it
that is exactly the failure geometry.

Outriggers work by widening the base, which is the denominator, so they raise the free-standing height directly.
A scaffold 5 ft wide is limited to 20 ft free-standing; outriggers taking the effective base to 10 ft double it.
That is often cheaper and faster than tying, and it is why outrigger frames exist.

Sheeting changes the problem entirely. A scaffold covered in netting or shrink wrap becomes a sail, and the
lateral load on the ties can multiply several times over -- so a tie pattern adequate for an open scaffold is not
adequate for the same scaffold once it is wrapped, and wrapping an erected scaffold without re-evaluating the ties
is a recognized cause of collapses.

The tie itself has to go to something. A tie anchored to a window frame, a gutter, a downspout, or a piece of
architectural trim is not resisting a lateral load, and that is a common finding -- the tie pattern is correct on
paper and every tie is anchored to something that cannot hold it.

**Inputs:** scaffold height and minimum base dimension, whether outriggers are used and the effective base they provide, the vertical and horizontal tie spacing, the tie anchor type and capacity, and whether the scaffold is sheeted

**Outputs:** the height-to-base ratio, the maximum free-standing height at the entered base, the height at which the first tie is required, the tie count at the entered spacing, the effective base outriggers would need to eliminate ties, and a flag when the scaffold is sheeted without a re-evaluated tie pattern

## 3. Worked example

A 5 ft wide frame scaffold erected to 60 ft:

```
height to base ratio = 60 / 5 = 12:1
free standing limit  = 4:1
maximum free standing height = 4 x 5 = 20 ft
```

**12:1 against a 4:1 limit** -- this scaffold requires ties, and the FIRST one goes at or below
20 ft. A scaffold with its first tie at 30 ft has 10 ft of unbraced height below it beyond the
free-standing limit, which is the geometry that folds.

Outriggers instead: taking the effective base to 10 ft gives a free-standing limit of 40 ft -- still short of
60, so this scaffold needs both.

**Sheeting.** Wrap this scaffold in shrink wrap and the wind load on it multiplies several times. A tie pattern
designed for open frames does not carry it, and the correct action is a re-evaluated tie pattern from the
manufacturer or a qualified person -- not the same ties with the wrap added, which is the sequence that collapses
scaffolds.

**And the anchors.** Ties at the correct spacing anchored to window frames, gutters, or trim are not ties. Each
one has to reach structure capable of the lateral load, and a tie pattern that is correct on the drawing and
anchored to cladding is a scaffold with no ties at all.

## 4. Scope and non-goals

A ratio check. Scaffold erection is governed by OSHA 1926 Subpart L and by the manufacturer's instructions, and
tie spacing, tie capacity, bracing, base support, and the allowable free-standing height are set by those -- the
4:1 ratio is a common threshold and not a universal rule, and manufactured system scaffolds have their own
limits. It does not design a scaffold or evaluate its capacity, leg loads (`scaffold-leg-load`), mudsills and
base bearing, or the structure the ties anchor to. It does not compute wind loading on sheeted scaffold, which
requires the sheeting's drag characteristics and the design wind speed and which must be evaluated by a qualified
person. It does not address planking, guardrails, access, fall protection, or the competent person inspections
required before each shift. Scaffold collapses are fatal: OSHA 1926 Subpart L, the scaffold manufacturer's
instructions, and the competent and qualified persons the standard requires govern.
