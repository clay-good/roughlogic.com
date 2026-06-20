# roughlogic.com Specification v120 -- Room Acoustics: Reverberation Time (RT60) and Axial Room Modes (calc-stage.js, Group N, 1 New Tile)

> **Status: SPECIFIED 2026-06-20, awaiting an execution pass.** In-scope catalog expansion under
> the spec-v106 charter: one stage / live-production tile from the public-domain Sabine
> reverberation equation and first-principles room-mode acoustics, designer governed,
> redo-not-harm. Adds one tile to **`calc-stage.js`** (Group N); no new module, group, or
> dependency. Inherits spec.md through spec-v119.md.
>
> **The gap, and the evidence for it.** Group N covers SPL, inverse-square, atmospheric absorption,
> speaker alignment, and impedance, but never the room itself: the reverberation time that decides
> intelligibility and the axial room modes that predict bass buildup and nulls. Both are everyday
> load-in math for a sound tech entering an unknown venue.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Volume is `L^3`, absorption (sabins, ft^2 of total absorption) is `L^2`, room dimensions `L`, RT60
is `T`, and mode frequencies are `T^-1`. Bundled constants (the 0.049 imperial Sabine coefficient,
the 1130 ft/s speed of sound) are annotated editable fields. The v18/v21 contract: any non-finite
input, or a non-positive volume, absorption, or room dimension, returns `{ error }`; the only
divisions are by guarded-positive absorption and dimensions. Citation discipline (v19/v22):
`GOVERNANCE.general` over the Sabine equation (W.C. Sabine, public domain) and the axial room-mode
relation f = c/(2 L); the acoustician and the venue govern.

## 2. The tile

### 2.1 `room-acoustics` -- Reverberation Time (RT60) and Axial Room Modes

```
inputs:
  volume_ft3          L^3   room volume (for RT60)
  total_sabins        L^2   total absorption (sum of surface area x absorption coefficient)
  length_ft           L     room length (for modes)
  width_ft            L     room width
  height_ft           L     room height

rt60_s   = 0.049 x volume_ft3 / total_sabins
mode_L_hz = 1130 / (2 x length_ft)    # first axial mode along length (c = 1130 ft/s)
mode_W_hz = 1130 / (2 x width_ft)
mode_H_hz = 1130 / (2 x height_ft)
```

**Pinned worked example.** 5,000 ft^3 room with 500 sabins of absorption, 20 x 15 x 10 ft:
`rt60 = 0.049 x 5000 / 500 = 0.49 s`; first axial modes `1130/(2 x 20) = 28.3 Hz`, `1130/(2 x 15) =
37.7 Hz`, `1130/(2 x 10) = 56.5 Hz`. **Cross-check:** the same room with only 250 sabins ->
`rt60 = 0.98 s` (more reverberant; the modes are unchanged because they depend on geometry, not
absorption). The acoustician and the venue govern treatment and sub placement.

## 3. Wiring

A `tools-data.js` row (group `N`, trade `["live-production", "av"]`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, Sabine equation + axial-mode relation, the
0.049 and 1130 constants listed); worked-examples fixtures (example + cross-check); `compute-map.js`
(`room-acoustics` -> `computeRoomAcoustics` in `../../calc-stage.js`); `related-tiles.mjs` (->
`spl-inverse-square` / `spl-atmospheric-absorption` / `decibel-converter`);
`data/search/aliases.json` ("reverberation time", "rt60", "room modes", "sabine", "venue
acoustics"); the id appended to the existing `STAGE_RENDERERS` declare in `app.js`; the `// dims:`
annotation; regenerated corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example,
cross-check, and error seams. Raise the `calc-stage.js` size cap by ~20 percent if needed; bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` +1 tile);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `data:verify`; worked-examples runner; 320 px audit (the RT60 and three mode lines wrap);
render-no-nan + a11y sweep, output read to the value (5,000 ft^3 / 500 sabins -> 0.49 s; 20 ft ->
28.3 Hz).

## 5. Roadmap position

Adds the room itself to the live-production acoustics family. Further Group N growth stays
evidence-driven.
