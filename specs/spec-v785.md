# roughlogic.com Specification v785 -- Winch Drum Fleet Angle (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N),
> no new module, group, or dependency. Inherits spec.md through spec-v784.md. Explore sweep #20 (entry 5).
>
> **The gap, and the evidence for it.** A rigger placing a winch and its lead sheave has to hold the **fleet angle** --
> the sideways angle the wire rope makes as it spools onto the drum -- inside a tight band, or the rope crushes earlier
> wraps, climbs the flange, or (too shallow) piles up. No tile does it. `fleet_angle = atan(lateral_offset /
> lead_distance)`. The number this settles: a **6 in** offset over a **240 in** lead is `atan(0.025) = ` **1.43 deg**,
> inside the 1.5 deg grooved-drum guideline. Grep confirmed no fleet-angle tile exists (`fleet` hits only the trucking
> fleet-size / fuel-tax tiles). This is a distinct quantity from `winch-drum-line-pull` (per-layer pull).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group N
stage siblings (`lighting-throw-for-pool`, another atan-geometry tile): the lateral offset and lead distance carry `L`
and the fleet angle is dimensionless; any consistent length unit works because the ratio cancels. The v18/v21 contract:
a non-finite input (via `_finiteGuard`), a negative offset, or a non-positive lead distance returns `{ error }`. Citation
discipline (v19/v22): the winch drum fleet angle by name (Wire Rope Users Manual; ANSI E1.6 for entertainment rigging),
`GOVERNANCE.rigging` matching the sibling; the note states the atan geometry, that the offset is largest at the drum
ends, and -- the key point -- that the acceptance **thresholds vary** (1.5 deg grooved, 2 deg smooth, ~0.5 deg pile-up
floor), so they are presented as a reference **status line**, not baked into the computed angle.

## 2. The tile

### 2.1 `winch-fleet-angle` -- Winch Drum Fleet Angle

```
inputs:
  lateral_offset   sideways distance, sheave groove plane to rope landing (any unit)
  lead_distance    perpendicular distance, drum to lead sheave (same unit)

fleet_angle = atan(lateral_offset / lead_distance) x 180/pi   [degrees]
status:  <= 1.5 deg  within grooved and smooth guidelines
         <= 2.0 deg  within smooth, over grooved
         >  2.0 deg  over the limit (rope climbs the flange / crushes wraps)
         <  0.5 deg  too shallow to cross-wind (pile-up risk)
```

**Pinned worked example.** Offset 6 in, lead 240 in: `fleet_angle = atan(6/240) = atan(0.025) = ` **1.43 deg**, inside
the 1.5 deg grooved-drum guideline. Doubling the lead to 480 in halves the tangent (about 0.72 deg); doubling the offset
to 12 in roughly doubles the angle (about 2.86 deg, over the limit). A zero offset is a zero angle (rope square to the
drum).

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["stage", "rigging"]`) placed with the stage tiles beside
`lighting-throw-for-pool` under the `// Group N` header (the `group:` field, not physical position, sets the group, so
the group-shell count stays consistent); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (winch drum fleet
angle, `GOVERNANCE.rigging`); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`winch-fleet-angle` -> `computeWinchFleetAngle`); `scripts/related-tiles.mjs` (-> `block-redirect-max-angle` /
`counterweight-arbor-load` / `truss-capacity`); `data/search/aliases.json` (5 collision-checked aliases: "fleet angle",
"winch drum fleet angle", "wire rope spooling angle", ...); the calc-stage `STAGE_RENDERERS` map entry via a hand-written
renderer (non-exported, so no DOM-sentinel row) and the id added to the calc-stage declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the lead/offset monotonicity, the zero-offset case, and the error
seams. The calc-stage.js gzip cap is unchanged (the addition fits under the current cap). Verify at build, including
`check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,233 -> 1,234.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (6 in over 240 in -> 1.43 deg).

## 5. Roadmap position

Adds the drum-spooling geometry check every winch installation is laid out against -- the fleet angle -- to the stage /
rigging bench, beside the redirect-angle and arbor-load tiles. Continues the post-inverse forward-coverage vein (Explore
sweep #20, the last queued entry). A winch-drum-line-pull (per-layer capacity) and a drum-capacity (rope length by layer)
tile are the natural next winch additions; they stay evidence-driven.
