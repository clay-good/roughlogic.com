# roughlogic.com Specification v1153 -- Flammable Liquid Cabinet Storage (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-28). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-construction.js`** (Group E), no new module, group, or dependency. Inherits spec.md through
> spec-v1152.md.
>
> **The gap.** A dupe scan for "flammable liquid", "storage cabinet", and "safety can" returned zero hits.

Repository: github.com/clay-good/roughlogic.com -- US standards only. OSHA is public domain, so the
provision is quoted.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: no quantity at
all, a negative quantity, a non-positive cap, or a non-integer count return `{ error }`. Renderer: this
module's `_simpleRenderer`. `check-module-sizes` cap for calc-construction.js raised 215000 -> 235000.

## 2. The tile

### 2.1 `flammable-cabinet-storage` -- Cabinet Storage Limits (OSHA 1926.152(b)(3))

```
inputs:  cat123_gallons, cat4_gallons, cabinets_available,
         per_cabinet_cat123_gal (60), per_cabinet_cat4_gal (120), max_cabinets_per_area (3)
compute: cabinets for each category = ceil(gallons / its cap)
         cabinets needed = the LARGER of the two (no blending rule in the standard)
         area ceiling = 3 cabinets = 180 gal Cat 1-3 / 360 gal Cat 4
outputs: cabinets_for_123, cabinets_for_4, cabinets_needed, mixed, area_cap_cat123_gal,
         area_cap_cat4_gal, over_area_cap_gal, within_area_cap, room_required,
         cabinets_ok, cabinets_short, too_many_cabinets, passes, note
```

**The sentence everyone skips is the one that decides the site.** *Not more than three such cabinets may
be located in a single storage area.* That makes **180 gallons** of Category 1-3 a hard ceiling for
cabinet storage, not a starting point -- and you cannot buy your way past it with a fourth cabinet. The
fuzzer pins that no cabinet count rescues 200 gallons in one area. Past the ceiling the standard sends you
to a genuinely separate area or a **specially constructed inside storage room**: fire-resistive
construction, self-closing fire doors, a noncombustible sill, ventilation, restricted electrical. That is
a building problem rather than a purchasing one, and much cheaper to discover at planning than at
inspection, so the tile leads with it.

**On mixed contents the standard is genuinely silent.** It states a limit for Category 1, 2 and/or 3 and
a limit for Category 4, with no blending rule. The conservative reading used here is that each cap applies
independently, so a cabinet must satisfy both and the count is the **larger** of the two -- 2, not 4, on
the cross-check fixture. That reading is stated explicitly, along with the note that an AHJ treating the
limits as additive would arrive at a higher number.

**A naming trap:** GHS-aligned categories replaced the older classes. Class I and II are Categories 1, 2,
and 3; Class III is Category 4. A cabinet stencilled to the old scheme holds the same gallons.

## 3. Scope

Not checked: cabinet approval, construction, labelling, and venting; container and portable tank sizes;
quantities permitted **outside** a cabinet in the work area, which are much smaller; separation from
ignition sources, exits, and stairways; dispensing, bonding, and grounding; inside storage room
construction; extinguisher provision; and state or local amendments, which on flammables are common.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `extinguisher-coverage`,
`excavation-protection-trigger`, and `dumpster-count`. Fuzzer pins both fixtures, that no cabinet count
rescues a quantity past the area cap, the exact 180-gallon ceiling seam, ceiling-division counting at five
quantities per category, that the mixed count is the max and explicitly not the sum, the at-least-one rule,
that all three limits are editable and move the answer, the `null` path when no on-hand count is given,
and every error seam including refusing to run with nothing to store.
