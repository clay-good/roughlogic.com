# roughlogic.com Specification v790 -- Sun Shadow Length (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v789.md. Explore sweep #21 (entry 6).
>
> **The gap, and the evidence for it.** Solar-access and site-planning work turns on **how long a shadow** a building,
> tree, or pole casts, and no discoverable tile does it (the `shadow_ft` term exists only buried inside the PV inter-row
> spacing tiles, not as a standalone object-shadow calc). `shadow = object_height / tan(sun_altitude)`. The number this
> settles: a **10 ft** object under a **30 deg** sun throws a **17.3 ft** shadow (1.73 x its height). Grep confirmed no
> standalone shadow-length tile exists; this is distinct from `pv-row-shade-angle` (which solves the sun angle a row
> layout stays shade-free to).
>
> **A note on the rejected queue entry.** The sweep-21 candidate `dovetail-over-pins` was dropped on review: the
> measurement-over-pins formula splits `tan(angle/2)` vs `cot(angle/2)` depending on whether the male dovetail is wider
> at the base or the top, an unresolved convention that fails the single-unambiguous-convention filter.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
solar-geometry siblings (`pv-row-spacing`, `pv-row-shade-angle`): the object height carries `L`, the sun altitude is
dimensionless (degrees), the shadow length carries `L`, and the shadow-to-height ratio is dimensionless. The v18/v21
contract: a non-finite input (via `_finiteGuard`), a non-positive object height, or a sun altitude outside `(0, 90]`
returns `{ error }` (a sun on the horizon throws an infinite shadow). Citation discipline (v19/v22): sun shadow-length
geometry by name (first-principles trigonometry), `GOVERNANCE.general` matching the siblings; the note states the
shadow = height x cot(altitude) relation, that the ratio depends only on the sun angle (equal at 45 deg, long at a low
sun), that the winter-design sun elevation gives the worst-case shade, and that level ground and a vertical object are
assumed.

## 2. The tile

### 2.1 `shadow-length` -- Sun Shadow Length

```
inputs:
  object_height_ft   height of the vertical object (ft)
  sun_altitude_deg   sun elevation above the horizon (deg, 0-90)

shadow_length = object_height / tan(sun_altitude)
shadow_ratio  = 1 / tan(sun_altitude) = cot(sun_altitude)
```

**Pinned worked example.** Object 10 ft, sun altitude 30 deg: `shadow = 10 / tan(30) = 10 / 0.57735 = ` **17.32 ft**;
`ratio = ` **1.73 x height**. At a 45 deg sun the shadow equals the height; a 20 deg winter sun throws a shadow nearly
three times the height; a high summer sun throws a short one.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["solar"]`) beside `pv-row-shade-angle` (Group A rows are spec-interleaved and
carry an explicit `group:` field, so the group-shell count stays consistent); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (shadow-length geometry, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned
example, two pinned outputs); `test/fixtures/compute-map.js` (`shadow-length` -> `computeShadowLength`);
`scripts/related-tiles.mjs` (-> `pv-row-spacing` / `pv-row-shade-angle` / `pv-array-sizing`); `data/search/aliases.json`
(5 collision-checked aliases: "shadow length calculator", "flagpole shadow length", "solar access shade study", ...); the
calc-solar `SOLAR_RENDERERS` map entry via a hand-written renderer (non-exported, so no DOM-sentinel row) and the id
added to the calc-solar declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the altitude monotonicity,
and the error seams. The calc-solar.js gzip cap is unchanged (the addition fits under the current cap). Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,238 -> 1,239.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (10 ft object, 30 deg sun -> 17.32 ft).

## 5. Roadmap position

Adds the general sun-shadow-length calc -- the one solar-access, tree-planting, and setback studies start from -- to the
solar bench, beside the PV row-spacing geometry. Closes the strong / medium tier of Explore sweep #21 (the low-value
`gestation-due-date` candidate is left unbuilt as reference-flavored date math). A shadow-length-to-object-height inverse
(estimate a tree or pole height from its shadow) is the natural companion; it stays evidence-driven.
