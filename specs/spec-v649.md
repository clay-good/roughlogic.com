# roughlogic.com Specification v649 -- Gear Identification (Pitch from Teeth and OD) (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`**
> (Group K, machining/mechanic), no new module, group, or dependency. Inherits spec.md through spec-v648.md.
>
> **The gap, and the evidence for it.** The `spur-gear-geometry` tile (spec-v401) works forward only: it needs the
> diametral pitch Pd as an input and returns the outside diameter `OD = (N+2)/Pd`. But the universal shop task is
> the reverse -- you have an *unknown* gear, you can count the teeth N and measure the OD with calipers, and the
> pitch is exactly the number you are trying to find. Inverting the sibling's own relation gives `Pd = (N+2)/OD`.
> Pure algebra, no table constant. The pinned example: count **40 teeth** on a gear measuring **4.200 in** across
> the tips and it identifies as **Pd 10** (pitch diameter 4.000 in, module 2.54 mm).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Mirroring the sibling,
the tooth count and the diametral pitch are `dimensionless`; the outside and pitch diameters are `L`; the module is
`L` (mm). The `25.4 mm/in` conversion and the standard 20-degree full-depth involute proportion `OD = (N+2)/Pd` are
the same ones `spur-gear-geometry` already uses. The v18/v21 contract: any non-finite input, or a non-positive tooth
count or outside diameter, returns `{ error }`. Citation discipline (v19/v22): the gear-geometry relation inverted
for the pitch, by name; the note states that **Pd = (N+2)/OD, the measured Pd is snapped to the nearest standard
diametral pitch for identification, and a large percent-off suggests a worn tip, a stub-tooth form, or a
metric-module gear read in inches** -- a shop aid, confirm against the gear drawing or a gear gauge.

## 2. The tile

### 2.1 `gear-identification` -- Identify a Spur Gear from Its Teeth and Outside Diameter

```
inputs:
  teeth            -    counted number of teeth N (> 0)
  outside_dia_in   in   measured outside (tip) diameter OD (> 0)

Pd            = (N + 2) / OD            [teeth/in]
pitch_dia     = N / Pd = N x OD/(N + 2) [in]
module_mm     = 25.4 / Pd              [mm]
nearest_std_pd = closest value in the standard diametral-pitch series
```

**Pinned worked example.** `N = 40`, `OD = 4.200 in`: `Pd = 42 / 4.200 = ` **10 teeth/in**; `pitch dia = 40/10 = `
**4.000 in**; `module = 25.4/10 = ` **2.54 mm**. The measured Pd of exactly 10 snaps to the standard Pd 10 (0% off).
**Cross-check (finer gear, smaller OD).** A 20-tooth gear measuring 1.100 in: `Pd = 22/1.100 = ` **20 teeth/in** --
a coarse gear reads a larger OD for the same tooth count.
**Cross-check (exact inverse of the geometry tile).** The fuzzer feeds the identified Pd back through
`spur-gear-geometry` and recovers the measured 4.200 in OD; a caliper a hair off (4.18 in) still snaps to Pd 10.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machining", "mechanic"]`, beside `spur-gear-geometry`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (gear geometry inverted, Machinery's Handbook / AGMA, the note per §1);
`test/fixtures/worked-examples.json` (the pinned example plus the finer-gear cross-check); `test/fixtures/compute-
map.js` (`gear-identification` -> `computeGearIdentification`); `scripts/related-tiles.mjs` (<-> `spur-gear-
geometry`, `gear-cascade`, `dividing-head`, `cutting-speed-rpm`); `data/search/aliases.json` ("gear identification",
"unknown gear pitch", "what pitch is my gear", plus question rows, all collision-checked);
`MACHINING_RENDERERS["gear-identification"]` via a hand-written renderer (the module's `makeNumber` /
`makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring `spur-gear-geometry`, with the mm
value kept in the output value string, not a field label, so the US-defaults gate stays clean) and the id added to
the calc-machining declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the example, the exact inverse round-trip through
`computeSpurGearGeometry`, the nearest-standard snap, and the error seams. The two `index.html` home-count spots go
1,097 -> 1,098 (check-readme-counts gates them). The calc-machining.js gzip cap is expected to hold (verify at
build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> Pd 10, pitch dia 4.000 in, module 2.54 mm).

## 5. Roadmap position

Completes the spur-gear pair: `spur-gear-geometry` (pitch -> geometry) and now `gear-identification` (measured
geometry -> pitch), exact inverses through the same `OD = (N+2)/Pd` relation. Further Group K growth stays
evidence-driven.
