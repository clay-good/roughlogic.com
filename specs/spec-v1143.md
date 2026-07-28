# roughlogic.com Specification v1143 -- Portable Fire Extinguisher Coverage (calc-fire.js, Group F, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F), no new module, group, or dependency. Inherits spec.md through spec-v1142.md.
>
> **The gap.** A dupe scan for "extinguisher" returned zero hits, in a module with 35 fire-ground tiles.
> `egress-travel-distance` is occupant egress, a different measurement entirely.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: a non-positive
area or cap, a negative travel distance, a Class B without a distance, or a class other than A, B, or K
return `{ error }`. Hand-written renderer, matching this module's convention. Group F exact-count
assertion in `citations.test.js` bumped 35 -> 36.

## 2. The tile

### 2.1 `extinguisher-coverage` -- Portable Fire Extinguisher Coverage (NFPA 10)

```
inputs:  floor_area_sf, hazard_class (A|B|K), travel_distance_ft (Class B only),
         area_cap_sf (11,250)
compute: travel     = 75 (A), 30 (K), or entered (B)
         spacing    = travel x sqrt(2)          worst point is a square's centre
         area/unit  = 2 x travel^2
         required   = max( ceil(area / area-per-unit), ceil(area / cap) )
outputs: travel_used_ft, grid_spacing_ft, area_per_unit_sf, by_travel, by_area_cap,
         required_extinguishers, travel_governs, cap_matches_geometry, note
```

**NFPA 10's two Class A limits are the same limit.** On a clear floor with units on a square grid, the
farthest anyone stands from one is the centre of a square -- `sqrt(2)/2` of the spacing -- so the spacing
can be `travel x sqrt(2)` and each unit covers `2 x travel²`. At 75 ft that is **11,250 sq ft exactly**,
which is the 6.1.3.3 ceiling. The area cap is not an independent margin; it is the geometry of the travel
distance. Knowing that tells you the ceiling **already assumes a perfectly open floor**. The tile computes
the identity rather than asserting it, and reports whether the entered cap matches.

**Which leads to the caveat that outranks the arithmetic.** Travel distance is measured along the **path
of travel**, not straight-line. A 75-ft walk around a partition can be 40 ft as the crow flies, so
racking, corridors, and locked doors all cost coverage the geometry cannot see. The tile labels its answer
a **floor** and says the number only goes up once the routes are walked.

**Class K makes the point from the other side.** At 30 ft a unit covers 1,800 sq ft, so over 40,000 sq ft
travel distance demands **23** units against 4 by the area ceiling -- nearly six to one. An area-based
count is badly wrong anywhere outside the Class A case the ceiling was derived from.

**What it refuses to do.** Class B travel distance is entered, not assumed, because it depends on the B
rating and the hazard level together. Class D is **not shipped** and returns an error naming the gap. And
the extinguisher **rating** is a separate determination from NFPA 10's maximum-area-per-unit-of-A table by
hazard classification, which is not reproduced -- a floor with the right *number* of extinguishers at too
small a rating still fails, and the note says so.

## 3. Scope

Also not checked: mounting height and the weight thresholds that change it, visibility and signage,
obstruction of the unit, inspection and maintenance intervals, and whether the occupancy requires
extinguishers at all.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `egress-travel-distance`,
`occupant-load`, and `sprinkler-density`. Fuzzer pins both fixtures, the `2d²` identity and the
grid self-consistency (corner-to-centre equals the travel distance) at five distances, that the required
count is always the larger of the two limits across eight area/class combinations, the exact ceiling
boundary, a tighter cap taking over from travel, Class B's required entry, Class D's refusal, that a
stray Class B distance never disturbs a fixed class, and every error seam.
