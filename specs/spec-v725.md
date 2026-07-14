# roughlogic.com Specification v725 -- Waterline Length for a Target Hull Speed (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v724.md. Sweep-11 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `hull-speed` tile runs the displacement relation forward: from a
> waterline length it returns the hull speed. The design question is the inverse -- **the waterline a hull needs to reach
> a target speed**. From `hull_speed = 1.34 x sqrt(LWL)`, `LWL = (target_speed / 1.34)^2`. The number this settles: an
> **8 kn** displacement cruiser needs a **~35.6 ft** waterline; 12 kn needs ~80 ft.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the `hull-speed`
sibling: the target speed is `L T^-1` (kn), the returned waterline is `L` (ft), and the speed-length coefficient is
dimensionless. It reuses the sibling's 1.34 Froude coefficient (editable, ~1.34-1.4); a non-positive coefficient defaults
to 1.34. The v18/v21 contract: any non-finite input, or a non-positive target speed or coefficient returns `{ error }`.
Citation discipline (v19/v22): the displacement hull-speed relation solved for the waterline, `GOVERNANCE.general`
matching the sibling; the note states that **this is the waterline a PURE DISPLACEMENT hull needs (near the speed-length
ratio of 1.34 the bow and stern waves merge and the hull hits a practical wall), so it is the displacement ceiling and
not a hard limit -- a semi-displacement or planing hull exceeds it with enough power and the right form -- and the hull
form, displacement, and power govern**.

## 2. The tile

### 2.1 `waterline-for-hull-speed` -- Waterline Length for a Target Hull Speed

```
inputs:
  target_hull_speed_kn   L T^-1        target displacement hull speed (> 0)
  coefficient            dimensionless speed-length coefficient (> 0, default 1.34)

waterline_length_ft = (target_hull_speed_kn / coefficient)^2
```

**Pinned worked example.** target = 8 kn, coefficient = 1.34: `LWL = (8 / 1.34)^2 = 5.970^2 = ` **35.6 ft**; feeding
35.6 ft back through `hull-speed` returns an 8.0 kn hull speed, the target. A 12 kn target needs a ~80 ft waterline, the
quadratic penalty of chasing displacement speed.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) placed beside `hull-speed` in the later spec-vNN section, well
past the Group K exact-12 audit block (the original Mechanic block); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (hull-speed relation solved for the waterline, `GOVERNANCE.general` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`waterline-for-hull-speed` ->
`computeWaterlineForHullSpeed`); `scripts/related-tiles.mjs` (-> `hull-speed` / `crouch-planing-speed` /
`prop-pitch-selection` / `fuel-range`); `data/search/aliases.json` (5 collision-checked question aliases: "waterline
length for hull speed", "how long a boat for 8 knots", ...); the calc-mechanic `MECHANIC_RENDERERS` map entry via the
shared `_simpleRenderer` factory (two number fields) and the id added to the calc-mechanic declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeHullSpeed` (default 1.34 coefficient
matching the forward), the faster-target-longer-waterline monotonicity, and the error seams. The calc-mechanic.js gzip cap
is raised 42000 -> 44000 B (the module was at 95.9%; this queue adds two mechanic inverse tiles). Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,173 -> 1,174.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 35.6 ft for an 8 kn
target).

## 5. Roadmap position

Pairs the forward hull-speed tile (`hull-speed`, speed from a waterline) with its inverse (waterline from a target speed),
the two halves of the displacement-speed question. Further Group K mechanic growth stays evidence-driven.
