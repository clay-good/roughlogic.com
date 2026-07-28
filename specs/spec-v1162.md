# roughlogic.com Specification v1162 -- Reach Ranges for Outlets and Controls (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 79 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1161.md.
>
> **The gap.** A dupe scan for "reach range", "side reach", "clear floor space", and "turning space"
> returned zero hits. The catalog had no tile answering the question an electrician asks on every
> accessible job: how high may this device go?

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown
approach or obstruction flag, a non-positive element height, a non-positive reach depth where the reach is
obstructed, or a negative obstruction height return `{ error }`. Renderer: this module's `_simpleRenderer`.

**Source.** 2010 ADA Standards for Accessible Design, 308.2.1, 308.2.2, 308.3.1, 308.3.2 and its two
exceptions. A US federal standard in the public domain, quoted directly.

## 2. The tile

### 2.1 `reach-range` -- Reach Ranges for Outlets and Controls (308)

```
inputs:  approach (forward|side), obstructed, obstruction_depth_in,
         obstruction_height_in, element_height_in
compute: forward unobstructed 15-48; forward obstructed 48 to depth 20, 44 to depth 25, none beyond
         side    unobstructed 15-48; side    obstructed 48 to depth 10, 46 to depth 24, none beyond
         side obstructed also: obstruction <= 34 in high and <= 24 in deep
outputs: max_height_in, min_height_in, rule, depth_permitted, max_obstruction_depth_in,
         shallow_limit_in, depth_to_gain_in, obstruction_height_ok, max_obstruction_height_in,
         high_ok, low_ok, height_excess_in, low_deficit_in, passes, note
```

**Two of the four rules behave in ways people do not expect.** Past **25 in** of forward reach depth the
section provides no permitted height at all, so the tile returns `null` rather than a number: the element
must *move*, and lowering it accomplishes nothing. That is the cross-check fixture, at 26 in. And on a side
reach the **obstruction has its own ceiling** -- 34 in high, 24 in deep -- which is the number that ends
arguments, because a standard 36-in counter is too *tall* to be reached over under this section whatever is
behind it. The only exceptions the section allows are washing machine and dryer tops at 36 in and fuel
dispenser operable parts at 54 in on existing curbs; both are quoted rather than paraphrased.

**The everyday case is the default example**: a 48-in switch reached over a 24-in counter is 2 in over the
46 in the second band allows. **The band edges are steps, not slopes** -- 20 in of forward depth permits 48
in and 20.1 in permits only 44 -- so the tile reports what trimming the depth buys, and the fuzzer pulls
back exactly that amount and asserts the maximum returns to 48.

**The 15-in floor is the end that gets missed on rough-in.** A receptacle at the framer's habitual 12 in
fails, and the tile says so in those terms rather than reporting a bare number.

## 3. Scope

A reach check, not a rough-in schedule. Every one of these ranges presumes a clear floor or ground space of
the right size and orientation is present -- a forward reach needs a forward approach, a side reach a
parallel one -- and the tile does not check for it. Also not checked: the 5 lbf operating force and
one-hand operation; which elements are operable parts and which are exempt; kitchen and kitchenette work
surfaces, appliances, and storage, which have their own sections; knee and toe clearance; and state and
local accessibility law and the electrical code, which sets its own mounting heights for different reasons.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `sign-character-height`,
`accessible-toilet-compartment`, `grab-bar-layout`, and `ada-ramp-slope`. The tools-data row sits inside the
parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, all four rules, every
band edge in both approaches with the two approaches proven to differ at the same depth, that past the
maximum depth no height passes at five element heights, monotonicity of the maximum against depth in both
approaches, the 34-in obstruction ceiling failing the reach on its own and applying to the side case only,
the 15-in floor with exact deficits, equality passing at every maximum, the trim round-trip at five
depths, and every error seam.
