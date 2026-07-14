# roughlogic.com Specification v673 -- Distance for a Target SPL (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N,
> live-production / AV), no new module, group, or dependency. Inherits spec.md through spec-v672.md.
>
> **The gap, and the evidence for it.** The `spl-distance` tile runs the inverse-square law forward: given a distance,
> it returns the sound pressure level there. The layout and hearing-safety question is the inverse -- **at what distance
> does the level fall to a target** (the 85 dB hearing-safe line, a noise-ordinance spill limit, a monitor position).
> The forward tile makes you guess distances and re-read the level; the inverse solves it directly. From
> `L2 = L1 - 20 log10(d2/d1) + mode_factor + 10 log10(N)`,
> `d2 = d1 x 10^((L1 + mode_factor + 10 log10(N) - L2) / 20)`. The number this settles: a 110 dB source at 1 ft falls to
> 84 dB at about **20 ft** in free field, and about **28 ft** with hemispherical reinforcement -- every doubling of
> distance loses 6 dB, read backward to a distance.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`spl-distance` sibling: the levels are `dimensionless` (decibels are a log ratio), the reference and returned distances
are `L` (ft), the mode is the same categorical select (`free_field` / `hemispherical` / `indoors`), and the source
count is `dimensionless`. The v18/v21 contract: any non-finite input, an unknown mode, a non-positive reference
distance, or a source count below 1 returns `{ error }`; additionally a target level at or above the mode- and
source-adjusted reference level is rejected (it would sit closer than the reference distance). Citation discipline
(v19/v22): the inverse-square law solved for distance, with ISO 9613-2 by name and `GOVERNANCE.rigging` matching the
sibling; the note states that **every doubling of distance drops the free-field level 6 dB, the target must be below the
adjusted reference level, the mode factor approximates surface reinforcement, N is the count of identical incoherent
sources, and this is a planning estimate -- the room and the measurement govern the real level**.

## 2. The tile

### 2.1 `spl-distance-for-level` -- Distance for a Target SPL

```
inputs:
  L1_dB         dB   SPL at the reference distance
  d1            ft   reference distance (> 0, default 1)
  target_L2_dB  dB   target SPL (< adjusted reference level)
  mode          -    free_field (0 dB) / hemispherical / indoors
  n_sources     -    identical incoherent sources (>= 1, default 1)

d2 = d1 x 10^((L1_dB + mode_factor + 10 log10(n_sources) - target_L2_dB) / 20)   [ft]
```

**Pinned worked example (free field).** L1 = 110 dB at d1 = 1 ft, target = 84 dB, free field (0 dB), N = 1:
`d2 = 1 x 10^((110 - 84) / 20) = 10^1.30 = ` **20 ft**; feeding 20 ft back through `spl-distance` returns 84 dB, the
input. **Cross-check (hemispherical reinforcement).** Same source and target with hemispherical mode (+3 dB
reinforcement): `d2 = 1 x 10^((110 + 3 - 84) / 20) = ` **28 ft** -- the reinforcement raises the level at every
distance, so the 84 dB line sits farther out.

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["live-production", "av"]`) placed in the later Group N section beside
`room-absorption-target`, NOT beside `spl-distance` in the original block -- the Group N audit-coverage test asserts
exactly 8 ids in the `// Group N: Stage`..`// Group O` block, so the row must stay out of it (matching how the recent
`room-absorption-target` and `led-tape-max-run` Group N tiles were placed); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (inverse-square solved for distance, `GOVERNANCE.rigging`, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`spl-distance-for-level` ->
`computeSPLDistanceForLevel` in `../../calc-stage.js`); `scripts/related-tiles.mjs` (-> `spl-distance` /
`spl-atmospheric` / `time-alignment`, and the forward tile links back); `data/search/aliases.json` ("distance for a
target spl", "hearing safe distance from speaker", "noise spill distance", plus rows); `STAGE_RENDERERS`
[`spl-distance-for-level`] via the module's `_r` renderer factory with the same mode select as the sibling (the select
value feeds the compute, satisfying check-dead-inputs) and the id added to the calc-stage declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the example, the round-trip through `computeSPL` across all three modes and source
counts, the hemispherical-farther check, and the error seams (unknown mode, non-positive reference, sources < 1,
non-finite, and an unreachable target at or above the reference level). The mechanical/rigging-governance test uses an
explicit id list this tile is not on, so no governance conflict. The calc-stage.js gzip cap (26,000 B, raised for v664
and v667) is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 20 ft for an 84 dB target).

## 5. Roadmap position

Pairs the forward SPL tile (`spl-distance`, level from distance) with its inverse (distance from a target level), the
two halves of the sound-coverage question. Further Group N growth stays evidence-driven.
