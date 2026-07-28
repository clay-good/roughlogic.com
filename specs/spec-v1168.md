# roughlogic.com Specification v1168 -- Staggered-Hole Net Width (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 85 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-steel.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1167.md.
>
> **The gap is self-declared.** `steel-tension-member` says in its own scope note that it "assumes
> standard holes in a single transverse line (no staggered s^2/4g chain)." A dupe scan for "prying",
> "staggered", and "s2/4g" confirmed nothing covered it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
width, thickness, or bolt diameter, a negative allowance, a non-integer or non-positive hole count, a
negative gage-space count, a non-positive gage or pitch where a gage space is crossed, a zigzag chain
crossing fewer holes than the straight one, or holes consuming the whole width return `{ error }`.
Renderer: this module's `_simpleRenderer`. `check-module-sizes` cap for calc-steel.js raised 26000 -> 32000 (the module reached 28,913 B gz, 111.2%).

**Source.** AISC 360 Section B4.3b (Net Area), a formula rather than a table -- no copyrighted content is
reproduced.

## 2. The tile

### 2.1 `staggered-net-width` -- Staggered-Hole Net Width (B4.3b)

```
inputs:  plate_width_in, thickness_in, bolt_dia_in, hole_allowance_in, gage_in, pitch_in,
         holes_straight, holes_zigzag, gage_spaces_zigzag
compute: hole = bolt diameter + allowance (1/8 in default)
         straight = W - n_straight x hole
         zigzag   = W - n_zigzag x hole + k x s^2/(4g)
         governing = the smaller;  An = governing x t
         ceiling pitch = sqrt(4 g (n_zigzag - n_straight) x hole / k)
outputs: hole_dia_in, gross_area_in2, net_width_straight_in, net_width_zigzag_in,
         stagger_credit_in, zigzag_governs, net_width_in, net_area_in2, efficiency, margin_in,
         pitch_where_straight_governs_in, pitch_headroom_in, stagger_maxed_out,
         no_stagger_net_width_in, stagger_gain_in, note
```

**The hole is not the bolt.** It deducts at the bolt diameter plus 1/8 in -- a 1/16 for the standard hole
and another for damage around it -- so using the bolt diameter overstates the net area once per hole in the
chain, which compounds quickly. The allowance is editable because oversized and slotted holes deduct more.

**Staggering has a ceiling, and that is the tile's real contribution.** The credit grows as *s²* while the
extra hole costs a fixed amount, so there is a pitch at which the two chains are exactly equal and past
which the straight chain governs and further stagger buys nothing. On the worked plate that pitch is
**2.291 in**: the default example sits below it with the zigzag governing by 0.21 in, and the cross-check
fixture sits above it, where opening the stagger further is wasted drawing. The fuzzer pins the flip a
hundredth either side of the ceiling and equality exactly on it.

**Two degenerate cases report honestly rather than numerically.** Where both chains cross the same number
of holes the zigzag can never govern and there is no ceiling pitch -- `null`, not zero. Where no gage space
is crossed there is no credit and the result is an ordinary straight-line net section.

**A render-output-key bug was caught before wiring**: the pitch-headroom output line read `r.pitch_in`,
which the compute never returned, so it would have rendered from `undefined`. The value is now computed as
`pitch_headroom_in` and pinned by the fuzzer -- the failure mode `check-field-accessors` and `render-no-nan`
exist to catch, found by reading rather than by the gate.

## 3. Scope

A net-width check, not a member design. Not checked: gross-section yielding, net-section rupture, or the
shear-lag factor U that turns An into Ae, which are `steel-tension-member`; block shear; bolt shear and
bearing; slenderness; **whether the chains entered are the governing ones**, which is a drawing question and
not an arithmetic one -- the tile evaluates the two chains it is given and does not find them; and angles
and other shapes, where the gage across the back of a leg uses the developed flat width and this
rectangular treatment does not apply.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `steel-tension-member`,
`steel-block-shear`, `bolt-shear-bearing`, and `slip-critical-with-tension`. The tools-data row sits inside
the parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the hole deduction
at four bolt-and-allowance combinations and the exact overstatement from omitting the allowance, the
s^2/4g credit at five pitch/gage/space combinations, that the credit grows with pitch and shrinks with
gage, the governing-chain flip a hundredth either side of the ceiling with equality on it, the ceiling and
headroom at six pitches, that the governing width never exceeds the straight chain, net area and efficiency
following thickness, both degenerate cases returning `null` rather than a number, and every error seam.
