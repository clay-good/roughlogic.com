# roughlogic.com Specification v779 -- Required Fall-Arrest Clearance (calc-rescue.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rescue.js`** (Group F),
> no new module, group, or dependency. Inherits spec.md through spec-v778.md. Explore sweep #19 (entry 5).
>
> **The gap, and the evidence for it.** Anyone tying off at height needs to know whether there is enough **clearance below
> the anchor** to arrest a fall before striking the lower level, and no tile computes it. The standard additive model is
> `RFC = free-fall distance + deceleration distance + worker height (D-ring to feet) + safety margin`. The number this
> settles: a **6 ft** free fall, **3.5 ft** deceleration (the Z359 lanyard cap), **5 ft** worker, and a **3 ft** margin
> need **17.5 ft**. Grep confirmed no `fall clearance` / `fall arrest` / `deceleration` tile exists.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group F/P
rescue siblings: every distance is a length (`L`). The v18/v21 contract: a non-finite input (via `_finiteGuard`), a
negative free-fall, deceleration, or safety margin, or a non-positive worker height returns `{ error }`. Citation
discipline (v19/v22): the additive clearance model by name (ANSI Z359.1 / OSHA 1926 Subpart M), `GOVERNANCE.fire`
matching the siblings, and the standard rescue-module "Notice:" governance prefix; the note explains each term (free-fall
depends on the anchor position and connector length; deceleration is the energy-absorber stroke, capped at 3.5 ft for a
shock-absorbing lanyard; worker height is ~5 ft; safety margin is 2-3 ft) and that a self-retracting lifeline cuts both
the free-fall and deceleration.

## 2. The tile

### 2.1 `fall-arrest-clearance` -- Required Fall-Arrest Clearance (ANSI Z359)

```
inputs:
  free_fall_distance_ft     free fall before the connector engages (ft, >= 0)
  deceleration_distance_ft  energy-absorber stroke (ft, >= 0; <= 3.5 lanyard)
  worker_height_ft          harness D-ring to the feet (ft, > 0)
  safety_margin_ft          clearance margin to the lower level (ft, >= 0)
  available_clearance_ft    optional; clearance actually below the anchor (ft)

required_clearance = free_fall + deceleration + worker_height + safety_margin
margin             = available_clearance - required_clearance   (null if no available)
adequate           = margin >= 0                                (null if no available)
```

**Pinned worked example.** free fall 6, deceleration 3.5, worker 5, margin 3:
`RFC = 6 + 3.5 + 5 + 3 = ` **17.5 ft**. With 20 ft available the margin is **+2.5 ft (adequate)**; with 15 ft it is
**-2.5 ft (not adequate)** and the worker would strike the level. Each term adds one-for-one, and exactly at RFC the
margin is 0 (adequate) -- all pinned in the fuzzer.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["rescue", "fire"]`) placed with the later Group F fire-ground tiles **outside
the exact-count (35) `// Group F: Fire-Ground` .. `// Group G` audit block** (beside `hydrant-available-flow`), so the
audit is untouched; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (the additive model, `GOVERNANCE.fire`);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`fall-arrest-clearance` ->
`computeFallArrestClearance`, module `calc-rescue.js`); `scripts/related-tiles.mjs` (-> `sling-angle` / `rope-ma` /
`confined-space-purge`); `data/search/aliases.json` (5 collision-checked aliases: "fall arrest clearance", "required fall
clearance", ...); the calc-rescue `RESCUE_RENDERERS` map entry via a hand-written renderer (the four clearance terms plus
an optional available-clearance field, using the module's aliased ui helpers) and the id added to the calc-rescue declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the adequacy check, the additivity across a sweep,
and the error seams. The calc-rescue.js gzip cap (raised to 9500 B in this spec) covers the addition. Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,227 -> 1,228.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 17.5 ft required, +2.5 ft
margin at 20 ft available).

## 5. Roadmap position

Adds the fall-protection clearance check to the rescue/fire bench alongside the rigging and confined-space tiles.
Continues the post-inverse forward-coverage vein (Explore sweep #19). A swing-fall (pendulum) radius tile is the natural
next fall-protection addition but its geometry carries convention nuances; it stays evidence-driven.
