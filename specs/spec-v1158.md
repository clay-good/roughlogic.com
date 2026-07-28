# roughlogic.com Specification v1158 -- Masonry Limited Access Zone and Bracing (calc-masonry.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec. Tile 75 of the +100 campaign.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-masonry.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1157.md.
>
> **The gap.** A dupe scan for "limited access zone", "masonry wall bracing", "impalement", and "rebar
> cap" returned zero hits. The catalog sizes masonry walls, weighs them, and lays them out; nothing
> covered the zone that has to exist on the ground beside one while it goes up.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
wall height or length, or a negative zone width, return `{ error }`. Renderer: this module's
`_simpleRenderer`. `check-module-sizes` caps raised: calc-masonry.js 18000 -> 21000 (the module reached 102.0%) and tools-data.js 280000 -> 290000 (the catalog registry was at 99.2% and gains a row per landing).

**Source.** OSHA 29 CFR 1926.706 (Subpart Q), a US federal regulation in the public domain and quoted
directly. No copyrighted table is involved.

## 2. The tile

### 2.1 `masonry-limited-access-zone` -- Masonry Limited Access Zone and Bracing (OSHA 1926.706)

```
inputs:  wall_height_ft, wall_length_ft, zone_width_provided_ft, zone_runs_full_length,
         zone_on_unscaffolded_side, established_before_start, bracing_in_place
compute: required width = wall height TO BE CONSTRUCTED + 4 ft
         zone ok   <- width ok AND full length AND unscaffolded side AND established before start
         bracing   <- required where height > 8 ft; null (not a pass) below it
outputs: required_zone_width_ft, width_ok, zone_width_shortfall_ft, zone_area_sf, provided_area_sf,
         full_length, unscaffolded, before_start, zone_ok, bracing_required, bracing_ok, passes, note
```

**The zone is a computed dimension, not a courtesy margin.** The standard says it "shall be equal to the
height of the wall to be constructed plus four feet, and shall run the entire length of the wall." For a
12 ft wall that is **16 ft wide by 60 ft long -- 960 sq ft** of ground restricted to the crew building the
wall. The default example provides 8 ft of tape, which is half the requirement.

**It scales with the finished height, which is the part that gets dropped.** The dimension follows the
wall *to be constructed*, so the full 16 ft applies from the first course -- at the moment when there is
nothing there yet to fall on anyone. That is exactly why the zone gets set narrow and grown later, and
exactly why doing so is wrong: the same section requires it established **prior to the start of
construction**.

**Two more conditions fail on their own, and the fuzzer pins each in isolation.** It runs the *entire*
length, without qualification, because a wall does not fall only in the middle. And it goes on the side
that will be **unscaffolded** -- the point of the rule, since the scaffolded side holds people who are
supposed to be there and who are watching the wall. The cross-check fixture is a 7 ft wall with a zone of
exactly the right width on the wrong side: the width passes and the tile fails it anyway.

**The bracing duration is what surprises people.** A wall **over** 8 ft must be adequately braced unless
adequately supported, and the bracing "shall remain in place until permanent supporting elements of the
structure are in place" -- not until the mortar cures, not until the crew leaves. On most jobs that is long
after the masons have moved on, which is when the brace gets pulled by someone with no idea what it was
holding. The trigger is *over* 8 ft, so 8 ft itself does not trigger it; the fuzzer pins 8.0 against 8.01,
and pins that an untriggered bracing check returns `null` rather than a pass.

## 3. Scope

A screen against the dimensional and procedural rules of one section. Not checked: the design of the
bracing itself, which is an engineering question and not a rule of thumb; the adequacy of any alternative
support; wall stability during construction and the wind that governs it; protruding reinforcing steel and
impalement protection, which is a different section; scaffold design on the working side; mortar and grout
strength gain; and whether the wall is a structural element requiring an engineer's involvement. Subpart Q
and the engineer of record govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `masonry-wall-weight`,
`material-stacking-limits`, `scaffold-guardrail-check`, and `masonry-count`. The tools-data row sits inside
the parsed Group E block, which has no exact count assertion. Fuzzer pins both fixtures, the height+4
identity at eight heights with equality passing, monotonicity in height, that wall length moves only the
area, the 8 ft trigger against its neighbour, each of the four zone conditions failing alone without
disturbing the dimension, exact non-negative shortfalls, and every error seam.
