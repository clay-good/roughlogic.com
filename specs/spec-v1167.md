# roughlogic.com Specification v1167 -- Silica Table 1 Respirator Lookup (calc-cross.js, Group G, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 84 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-cross.js`** (Group G), no new module, group, or dependency. Inherits spec.md through
> spec-v1166.md.
>
> **The gap.** A dupe scan for "silica" and "respirator" returned only `dust-control-water` and the
> asbestos/lead containment take-off. The catalog had nothing answering the question that decides whether
> a concrete-cutting crew can work at all today.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: an unknown task,
location, or controls flag, a non-positive or over-24 hour figure, or a negative APF return `{ error }`.
Renderer: this module's `_simpleRendererG`. Group G count assertion 37 -> 38.

**Source.** OSHA 29 CFR 1926.1153 Table 1 with 1926.1153(c)(1) and (d). A US federal regulation in the
public domain, quoted directly. The respiratory-protection column was read from the OSHA text in three
separate passes and cross-checked row by row before it was encoded.

## 2. The tile

### 2.1 `silica-table-1` -- Silica Table 1 Respirator Lookup (1926.1153)

```
inputs:  task (i..xviii), location (outdoors|indoors), hours_per_shift,
         controls_fully_implemented, apf_provided
compute: lookup by row x location x (<= 4 h | > 4 h)
         controls not fully implemented, OR no entry for the location -> outside Table 1,
           and 1926.1153(d) governs against 50 ug/m3 as an 8-hour TWA
outputs: task_label, over_four, outdoor_only, indoor_permitted, in_table_1, required_apf,
         low_apf, high_apf, has_cliff, hours_to_upgrade, respirator_required, apf_ok,
         apf_shortfall, other_location_apf, indoor_move_penalty, pel_ug_m3, passes, note
```

**Table 1 is all or nothing.** 1926.1153(c)(1) requires the engineering controls, work practices *and*
respiratory protection fully and properly implemented, so doing part of the row does not buy part of the
benefit -- the job falls to exposure assessment against the 50 ug/m3 PEL, which is a monitoring obligation
rather than a respirator choice, and is the expensive path Table 1 exists to avoid. The fuzzer pins that
partial controls void every row, including the ones that need no respirator at all.

**The duration column is a cliff, not a ramp.** The default example is tuckpointing at five hours, where
APF 10 becomes **APF 25** -- a half mask becoming a PAPR or full facepiece, which is a different purchase,
a different fit test, and a different training record, all turning on one minute past four hours. Four
hours exactly belongs to the *low* column, and the tile reports how much headroom is left before the step.

**Several rows change or vanish indoors.** The cross-check fixture is a walk-behind saw needing nothing
outdoors and APF 10 in an enclosed area -- enclosure is a control decision with a respirator attached.
Drivable saws, dowel drilling rigs, fiber-cement saws, and large drivable milling machines have **no indoor
entry**, so taking them inside leaves Table 1 entirely rather than defaulting to the outdoor answer. In the
other direction, dowel rigs and tuckpointing grinders require a respirator at *any* duration, which is the
assumption people get wrong when they treat a ten-minute task as a free one.

**What this tile deliberately does not do.** It reproduces the respiratory-protection column only. The
engineering controls and work practices are specified row by row in Table 1 and are *assumed* here rather
than reproduced -- stated in the note, the citation, and the assumptions -- so the row has to be read
before the respirator answer means anything.

## 3. Scope

A Table 1 lookup, not an exposure assessment. Not checked: whether the material contains crystalline
silica; the written exposure control plan and the competent person; fit testing, medical evaluation, and
the written respiratory protection program under 1910.134; housekeeping restrictions on dry sweeping and
compressed air; medical surveillance and its 30-day-per-year trigger; multiple tasks in one shift, which
are not added together; and state plans with more stringent requirements.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `hearing-protector-nrr`, `noise-dose`,
`dust-control-water`, and `heat-stress`. Fuzzer pins both fixtures and **all eighteen rows in all four
cells** against an independently written table, the outdoor-only flag and that such a row leaves Table 1
indoors rather than defaulting to zero, the four-hour seam with four itself in the low column, exact
headroom and its `null` past the cliff, that the same row can have a cliff indoors and none outdoors,
monotonicity in hours across every row and location, that indoors is never less protective than outdoors,
the all-or-nothing rule on three representative rows, over-protection never failing, the other-location
figure, and every error seam.
