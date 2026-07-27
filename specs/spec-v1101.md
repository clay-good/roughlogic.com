# roughlogic.com Specification v1101 -- Extension Ladder Overlap and Working Height (calc-cross.js, Group G, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-cross.js`**
> (Group G), no new module, group, or dependency. Inherits spec.md through spec-v1037.md.
>
> **Numbering note.** This campaign moves to the **v1101+ band**. A concurrent session working the same
> checkout also takes "the next free number," and we collided twice (v1030 and v1036), each costing a
> rebase and a rename. Separate bands remove the problem; the other session keeps the v103x sequence.
>
> **The gap, and the evidence for it.** `ladder-angle` returns only `{base_distance_ft, set_angle_deg,
> pass}` -- the 4:1 setup. Nothing computes overlap, working length, or reachable height; "overlap", "fly
> section", and "extension ladder" return no hits anywhere. Discovery batch 2 flagged the setup angle a
> DUPE and the overlap half a genuine gap.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
length, fewer than 2 sections or a non-integer count, a negative override, or a geometry where the overlap
exceeds a section or the whole ladder return `{ error }`. Renderer: this module's `_simpleRendererG`
factory. **Registration gotcha recorded:** `CROSS_RENDERERS` is an object literal built mid-file, so a
renderer const appended at the end cannot be referenced inside it (temporal dead zone) -- the tile assigns
`CROSS_RENDERERS["..."] = ...` after its definition, with a comment saying why.

## 2. The tile

### 2.1 `extension-ladder-overlap` -- Extension Ladder Overlap and True Working Height

```
inputs:  nominal_length_ft (as labeled), sections (2), overlap_override_ft (0 = rule)
compute: overlap   = 3 ft if nominal <= 36, else 4 ft        (override wins)
         joints    = sections - 1
         working   = nominal - overlap x joints
         top_support = working / sqrt(1 + 1/16)     4:1 makes WORKING the hypotenuse, not the height
         base_offset = top_support / 4
         max_landing = top_support - 3              a ladder must extend 3 ft above a landing
outputs: rule_overlap_ft, overlap_ft, joints, section_length_ft, working_length_ft, lost_ft,
         top_support_ft, base_offset_ft, max_landing_ft, can_reach_landing, note
```

**Three facts a user gets wrong, in order.** (1) The ladder does not reach its label: a 24-ft ladder gives
21 ft of working length. (2) That working length is the HYPOTENUSE once the ladder is set at 4:1, so the
top support is 20.4 ft, not 21. (3) To step off onto a landing the ladder must extend 3 ft past it, so the
highest floor a 24-ft ladder serves is 17.4 ft. Each step costs height, and only the first is widely known.

**Source and the gap in it.** The overlap rule is quoted from the US Office of Congressional Workplace
Rights extension-ladder fast facts (public domain, restating the OSHA/ANSI requirement): "at least 3 feet
for ladders up to 36 feet and 4 feet for 40-feet or longer." That wording leaves **36 to 40 ft unstated**.
The tile takes the conservative 4 ft above 36 and says so in the note and citation, and because some
standards add a 5-ft tier past 48 ft, the overlap is an override input.

**Worked example (pinned).** 24 ft, 2 sections: overlap 3, working 21.0, top support 20.373, base 5.093,
highest landing 17.373 ft. Three-section cross-check, 60 ft: overlap 4 at TWO joints, working 52.0, top
support 50.447 -- the extra joint is why three-section ladders give up so much more.

## 3. Scope limits

Geometry only. The duty rating (Type IAA/IA/I/II) is a separate limit and is named in the note, as are
securing the top, tying the base, and the fact that the 4:1 setup is what makes the hypotenuse relation
hold. OSHA/ANSI and the employer's ladder program govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `ladder-angle`. Fuzzer pins both worked
examples, the exact hypotenuse relation against an independent sqrt(17)/4 computation, the 36-ft overlap
tier boundary on both sides, the override, the two-joint penalty for three sections, exact linearity of
working length in nominal length, the negative-landing flag on a short ladder, and error seams.
