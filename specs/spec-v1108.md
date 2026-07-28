# roughlogic.com Specification v1108 -- Gear Undercut Minimum Teeth and Backlash (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-machining.js`** (Group K), no new module, group, or dependency. Inherits spec.md through
> spec-v1107.md.
>
> **The gap, and the evidence for it.** A self-declared gap, quoted from `spur-gear-geometry`'s citation:
> it "returns the geometry only; it does not check tooth strength, **backlash, or undercutting**." Tooth
> strength was closed by `gear-tooth-bending-stress` (spec-v1015); the other two were still open.
> `gear-chordal-thickness` returns caliper dimensions. Zero alias hits for "undercut" or "backlash".

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a pressure angle
outside (0, 90), a non-integer or non-positive tooth count, a non-positive addendum coefficient, or
negative optional inputs return `{ error }`. Optional inputs accept 0 to skip. Renderer: hand-written
non-exported (this module's convention). **No table is shipped** -- both results are closed form.

## 2. The tile

### 2.1 `gear-undercut-backlash` -- Gear Undercut Minimum Teeth and Backlash

```
inputs:  pressure_angle_deg (20), teeth, addendum_coefficient (1.0 full depth / 0.8 stub),
         center_distance_change_in (0 = skip), diametral_pitch (0 = skip)
compute: Nmin_exact = 2k / sin^2(phi);  Nmin = ceil(Nmin_exact);  undercut = teeth < Nmin
         B = 2 x dC x tan(phi)
         circular pitch = pi / Pd, and the backlash as a percentage of it
outputs: min_teeth_exact, min_teeth, undercut, shortfall, backlash_in,
         circular_pitch_in, backlash_pct_of_pitch, note
```

**The verification is that the formula reproduces the famous numbers.** `2k/sin^2(phi)` gives 31.90 at
14.5 degrees, 17.10 at 20, and 11.20 at 25 -- ceiling to **32, 18, and 12 teeth**, the exact minimums every
gear reference tabulates. That is a strong check: the tile derives values that are usually looked up, and
the fuzzer asserts all three. It also explains a piece of industry history the note states plainly -- the
move to higher pressure angles happened because 25 degrees lets a 12-tooth pinion exist.

**The backlash relation is the one people get wrong.** Opening the center distance by dC does NOT open the
backlash by dC: the flanks separate along the line of action, so `B = 2 dC tan(phi)`. At 20 degrees, 0.010
in of center distance yields 0.00728 in of backlash -- less than the movement, not more.

**Worked example (pinned).** 20 degrees, 14 teeth, full depth, 0.010 in center-distance increase, Pd 10:
undercut by 4 teeth against the 18-tooth minimum; backlash 0.007279 in, which is 2.32% of the 0.31416 in
circular pitch. Cross-check: the same 14-tooth pinion at 25 degrees CLEARS the 12-tooth minimum.

## 3. Scope limits

Standard proportions with **no profile shift assumed** -- and profile shift (a long-addendum pinion with a
matching short-addendum gear) is the usual fix for an undercut pinion and changes both outputs, which the
note says. Backlash here is only the component from center-distance change; tooth-thickness reduction and
runout also contribute. Backlash is not a defect: a mesh needs it for lubricant film and thermal growth,
and the note says that too. The gear drawing and the AGMA standard govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `spur-gear-geometry`. Fuzzer pins all
three classic minimums, the exact 2k/sin^2 identity across five pressure-angle and addendum combinations,
monotonic decrease of the minimum with pressure angle, the stub-tooth reduction, the backlash relation
across four cases plus its linearity, that backlash is always less than 2 dC below 45 degrees, and the
skip-on-zero behavior of both optional inputs.
