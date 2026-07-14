# roughlogic.com Specification v727 -- Max Screen Size for a Projector (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N),
> no new module, group, or dependency. Inherits spec.md through spec-v726.md. Sweep-11 inverse queue.
>
> **The gap, and the evidence for it.** The `projector-brightness` tile runs the AV screen-luminance identity forward:
> from a screen's size, gain, and target foot-lamberts it returns the lumens the projector must put out. The buyer's
> question is the inverse -- **given the projector you own, how big a screen will it light** to a target brightness. From
> `required_lumens = target_fL x area / gain`, `max_area = lumens x gain / target_fL`, then the width, height, and
> diagonal at a chosen aspect ratio. The number this settles: a **5,000-lumen** projector on a **unity-gain** screen at
> **16 fL** tops out near a **27 ft** (16:9) diagonal.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`projector-brightness` sibling: the lumens, gain, foot-lamberts, and aspect-ratio numbers are dimensionless, the returned
area is `L^2`, and the width, height, and diagonal are `L`. It reuses the sibling's foot-lamberts = lumens x gain / area
identity, solved for the area. The v18/v21 contract: any non-finite input, a non-positive lumens / gain / foot-lamberts,
or a non-positive aspect-ratio dimension returns `{ error }`. Citation discipline (v19/v22): the screen-luminance identity
solved for the area, `GOVERNANCE.worker_safety` matching the sibling; the note states that this is the **dark-room 16 fL
baseline** (a lit or ambient room wants 30-50 fL, which shrinks the screen), that the projector should be sized **20-30%
over the minimum** for lamp aging and a dirty filter, that a **high-gain screen** covers more area on-axis but narrows the
good seats, and that the **throw distance and lens range** must be checked against the room separately.

## 2. The tile

### 2.1 `projector-max-screen-size` -- Max Screen Size for a Projector

```
inputs:
  available_lumens      dimensionless projector brightness (ANSI lumens, > 0)
  screen_gain           dimensionless screen gain (> 0, default 1.0)
  target_foot_lamberts  dimensionless target luminance (fL; > 0, default 16 dark / 30-50 lit)
  aspect_w              dimensionless aspect-ratio width (> 0, default 16)
  aspect_h              dimensionless aspect-ratio height (> 0, default 9)

max_area_sqft   = available_lumens x screen_gain / target_foot_lamberts
max_width_ft    = sqrt(max_area_sqft x aspect_w / aspect_h)
max_height_ft   = max_width_ft x aspect_h / aspect_w
max_diagonal_ft = sqrt(max_width_ft^2 + max_height_ft^2)
```

**Pinned worked example.** lumens = 5000, gain = 1.0, target = 16 fL, aspect 16:9:
`max_area = 5000 x 1.0 / 16 = 312.5 ft^2`, `max_width = sqrt(312.5 x 16/9) = 23.57 ft`, `max_height = 13.26 ft`,
`max_diagonal = sqrt(23.57^2 + 13.26^2) = ` **27.04 ft**; feeding that width and height back through
`projector-brightness` at the same gain / target returns 5,000 lumens, the input. A brighter 8,000-lumen projector lights
a 34.2 ft diagonal under the same target.

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["live-production","av"]`) placed beside `projector-brightness` in the later
spec-v92 section, well past the Group N exact-8 audit block; a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(screen-luminance identity solved for the area, `GOVERNANCE.worker_safety` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`projector-max-screen-size` -> `computeProjectorMaxScreenSize`); `scripts/related-tiles.mjs` (-> `projector-brightness`
/ `led-video-wall` / `lighting-beam` / `power-distro`); `data/search/aliases.json` (5 collision-checked question aliases:
"max screen size", "biggest screen for projector", ...); the calc-stage `STAGE_RENDERERS` map entry via the shared `_r`
factory (five number fields) and the id added to the calc-stage declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the example, the round-trip through `computeProjectorBrightness` across a lumens/gain/target/aspect sweep, the aspect-ratio
preservation, the more-lumens-more-area monotonicity, and the error seams. The calc-stage.js gzip cap (raised to 30000 B
in this spec) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint.
Home tile count 1,175 -> 1,176.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 27.0 ft diagonal for a
5,000-lumen projector at 16 fL).

## 5. Roadmap position

Pairs the forward projection tile (`projector-brightness`, lumens a screen needs) with its inverse (the screen a
projector lights), the two halves of the AV sizing question. Closes the sweep-11 projection pair. Further Group N
live-production growth stays evidence-driven.
