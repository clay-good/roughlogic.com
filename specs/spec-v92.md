# roughlogic.com Specification v92 -- LED Video Wall and Projection Brightness (Group N, 2 New Tiles)

> **Implementation status: CLOSED -- landed 2026-06-18 (package 0.65.0; specs v90-v100 each targeted a minor individually but landed in one commit, so they stamp a single 0.65.0) (target catalog
> 640 -> 642; 25 groups; a minor stamp).** v92 inherits everything from spec.md
> through spec-v91.md and changes none of it. It adds two tiles to **Group N (Stage
> and Live Production)** and changes no existing tile's output. **No new group, no
> new dependencies, no telemetry, no AI, US standards only.** Both land in
> `calc-stage.js` (the existing home of every Group N tile -- see the §3 module note
> on the cap bump).
>
> **The gap, and the evidence for it.** Group N already covers the audio and
> conventional-lighting side of a show: `spl-distance`, `spl-atmospheric`,
> `decibel-converter`, `amp-power-spl`, `speaker-impedance`, `speaker-70v-line`
> (in Group A), `time-alignment`, `dmx-planner`, `power-distro`, `neutral-imbalance`,
> `truss-capacity`, `rigging-check`, and `lighting-beam` (the v51 fixture-photometry
> tile -- beam diameter and footcandles for a *lighting fixture*). What it does
> **not** have is the video side, which is now the largest single power, weight, and
> rigging item on most stages: the **LED video-wall build** (cabinet count, total
> resolution, physical size, weight, average and peak power, and the minimum
> comfortable viewing distance from the pixel pitch) and the **projection brightness**
> a screen needs (required projector lumens from the screen area, gain, and target
> foot-lamberts, with the throw distance). A concept-check against the post-v91 live
> ids for led-video-wall, led-wall, video-wall, pixel-pitch, projector, and
> projection returned nothing. `lighting-beam` is fixture photometry, not projection;
> `power-distro` distributes a load it is given but does not derive the video wall's
> load. These two are the first numbers an LED tech or a projectionist runs to spec a
> wall or a screen, and the catalog has neither.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `led-video-wall` carries a pixel count times a pitch
  (length) to a physical length, a cabinet count (dimensionless) times a per-cabinet
  weight (force) and power (watts) to totals, and a pitch (length) to a viewing
  distance (length); `projector-brightness` carries a foot-lambert (luminance) times
  an area over a dimensionless gain to a luminous flux (lumens), and a dimensionless
  throw ratio times a width to a distance. Every constant -- 304.8 mm per foot,
  3.28084 ft per meter -- is bundled and annotated.
- The v18/v21 tile contract applies. Any non-finite input returns `{ error }`. A
  non-positive cabinet pixel count, pixel pitch, column or row count, screen width or
  height, screen gain, or target foot-lambert returns `{ error }`. An average-power
  factor outside the open-to-one interval (0, 1] returns `{ error }`. Optional outputs
  are `null` when their trigger input is left at zero: the total weight is `null` when
  no per-cabinet weight is given, the peak and average power are `null` when no
  per-cabinet wattage is given, and the throw distance is `null` when no throw ratio
  is given.
- The v19/v22 citation discipline applies. Both use **`GOVERNANCE.worker_safety`**
  (a video wall is a rigged, powered structure -- the maker's load, power, and rigging
  data govern, and a heavy wall is a fall and crush hazard; the same governance the
  Group N rigging-adjacent tiles use). Sources are named, never reproduced: the LED
  panel **maker's spec sheet** (native pixel count, pitch, per-cabinet weight, and
  per-cabinet peak watts); the **"about 1 meter of viewing distance per 1 mm of pixel
  pitch" rule of thumb** for the minimum comfortable distance; the **standard AV
  screen-luminance identity** foot-lamberts = lumens x gain / screen area; and the
  **SMPTE-style target luminance ranges** (about 16 foot-lamberts for a dark room,
  more for ambient light). Every value -- the pitch rule, the average-power fraction,
  the foot-lambert target -- is an editable input, and the maker's data governs the
  final build.
- Tile ids are kebab-case and checked against the post-v91 live ids. None collides
  with `lighting-beam`, `power-distro`, `spl-distance`, or any Group N tile (see
  Section 3).

## 2. The tiles

### 2.1 `led-video-wall` -- LED Video Wall Build (resolution, size, power, weight, viewing distance) (Group N, calc-stage.js)

From a cabinet's native pixel count and pitch and the wall layout, this gives the
total resolution, the physical size, the cabinet count, and -- when the spec sheet's
weight and power are supplied -- the total weight and the average and peak power, plus
the minimum comfortable viewing distance.

```
inputs:
  cab_w_px         -    cabinet horizontal pixels (e.g. 168)
  cab_h_px         -    cabinet vertical pixels (e.g. 168)
  pixel_pitch_mm   L    pixel pitch (mm, e.g. 2.6)
  cols             -    cabinets wide
  rows             -    cabinets tall
  cab_weight_lb    F    optional weight per cabinet (lb; 0 = off)
  cab_max_watts    -    optional peak power per cabinet at full white (W; 0 = off)
  avg_power_factor -    fraction of peak for average content (default 0.35; must be in (0, 1])

cab_w_mm     = cab_w_px * pixel_pitch_mm
cab_h_mm     = cab_h_px * pixel_pitch_mm
total_w_px   = cab_w_px * cols
total_h_px   = cab_h_px * rows
total_pixels = total_w_px * total_h_px
cabinets     = cols * rows
width_ft     = cab_w_mm * cols / 304.8
height_ft    = cab_h_mm * rows / 304.8
total_weight = cab_weight_lb > 0 ? cab_weight_lb * cabinets : null
peak_power_w = cab_max_watts > 0 ? cab_max_watts * cabinets : null
avg_power_w  = cab_max_watts > 0 ? peak_power_w * avg_power_factor : null
min_view_ft  = pixel_pitch_mm * 3.28084     (the ~1 m per 1 mm pitch rule)
```

Outputs: the total resolution (W x H px) and total pixels, the physical size (width
and height in feet, and each cabinet in mm), the cabinet count, the total weight, the
peak and average power, and the minimum comfortable viewing distance. The note line
states: resolution is fixed by the *pixel count*, while the *pitch* sets the physical
size and the closest a viewer should sit -- the "about 1 meter per 1 mm of pitch"
rule means a 2.6 mm wall reads cleanly from roughly 8.5 ft back; peak power is the
spec-sheet draw at full white, but real content averages roughly 30 to 40 percent of
that, so size the average for the breaker math (`power-distro`) and the peak for the
worst case; the weight drives the rigging (see the rigging group); and confirm the
native pixel count, pitch, weight, and peak watts on the maker's spec sheet.

**Worked example (pinned).** A 168 x 168 px cabinet, 2.6 mm pitch, 10 columns x 6
rows, 18 lb and 200 W peak per cabinet, 0.35 average factor: each cabinet = 168 x 2.6
= **436.8 mm** square; total resolution = 1,680 x 1,008 px = **1,693,440 pixels**;
width = 436.8 x 10 / 304.8 = **14.33 ft**; height = 436.8 x 6 / 304.8 = **8.60 ft**;
cabinets = **60**; weight = 18 x 60 = **1,080 lb**; peak power = 200 x 60 =
**12,000 W**; average = 12,000 x 0.35 = **4,200 W**; minimum viewing = 2.6 x 3.28084
= **8.53 ft**. Cross-check (a finer 1.9 mm pitch, same cabinet grid): resolution is
unchanged at **1,680 x 1,008**, but the wall shrinks to 168 x 1.9 x 10 / 304.8 =
**10.47 ft** wide and the minimum viewing distance drops to **6.23 ft**. Cross-check
(a brighter average factor, 0.5): average power = 12,000 x 0.5 = **6,000 W**.
Degenerate inputs (any pixel count <= 0, pitch <= 0, cols <= 0, rows <= 0, an
average-power factor not in (0, 1], non-finite) return an error; a zero weight or zero
peak-watts input returns the corresponding `null` outputs.

### 2.2 `projector-brightness` -- Projector Brightness and Throw (Group N, calc-stage.js)

The lumens a projector needs to light a screen to a target brightness: from the
screen size, gain, and target foot-lamberts, the required lumens, with the throw
distance from the throw ratio.

```
inputs:
  screen_w_ft           L    screen width (ft)
  screen_h_ft           L    screen height (ft)
  screen_gain           -    screen gain (default 1.0)
  target_foot_lamberts  -    target screen luminance (fL; default 16, the SMPTE-style dark-room baseline)
  throw_ratio           -    optional throw ratio = distance / width (0 = off)

area_sqft        = screen_w_ft * screen_h_ft
required_lumens  = target_foot_lamberts * area_sqft / screen_gain
throw_distance_ft= throw_ratio > 0 ? throw_ratio * screen_w_ft : null
```

Outputs: the screen area, the required projector lumens (ANSI), and -- when a throw
ratio is given -- the throw distance. The note line states: screen brightness in
foot-lamberts is the lumens hitting the screen times the screen gain divided by the
screen area, so a bigger screen needs proportionally more lumens; about 16
foot-lamberts is the dark-room baseline, while an ambient or lit room wants roughly 30
to 50; account for lamp aging and a dirty filter by sizing 20 to 30 percent over the
minimum; a high-gain screen is brighter on-axis but narrows the good seats; and the
throw distance is the throw ratio times the screen width -- check it against the room
and the lens range.

**Worked example (pinned).** A 16 ft x 9 ft screen, gain 1.0, 16 fL target, 1.5 throw
ratio: area = **144 sq ft**; required lumens = 16 x 144 / 1.0 = **2,304 lumens**;
throw distance = 1.5 x 16 = **24 ft**. Cross-check (an ambient room at 30 fL): 30 x
144 / 1.0 = **4,320 lumens**. Cross-check (a high-contrast 1.3-gain screen at the same
16 fL): 16 x 144 / 1.3 = **1,772 lumens**. Degenerate inputs (screen_w_ft <= 0,
screen_h_ft <= 0, screen_gain <= 0, target_foot_lamberts <= 0, non-finite) return an
error; a throw_ratio of 0 returns a `null` throw distance.

## 3. Concept-check and wiring

Concept-checked against the post-v91 live tiles. `lighting-beam` (v51) is the
photometry of a *lighting fixture* -- beam diameter and footcandles from a beam angle
and throw -- not the lumens a *projector* needs for a screen, and not an LED wall
build. `power-distro` distributes a load across phases but does not *derive* a video
wall's load; `led-video-wall` feeds it the average and peak watts. `truss-capacity`
and `rigging-check` size the support but do not compute the wall's weight;
`led-video-wall` gives them the number. No live tile computes LED-wall resolution,
size, power, or weight, or projection brightness. **Both ship**, into
`calc-stage.js`.

Per-tile wiring (each of the two): a `tools-data.js` row (group `N`, trades
`["live-production", "av"]` -- the trade tags the existing Group N rows use);
`tile-meta.js` `_TILES`; a `citations.js` entry (the `GOVERNANCE.worker_safety`
governance from Section 1; the formula string; assumptions listing every bundled
constant -- the 304.8 mm/ft and 3.28084 ft/m conversions, the 1-m-per-1-mm pitch
rule, the 0.35 default average-power fraction, the foot-lambert luminance identity and
the 16/30-50 fL target ranges -- naming the panel maker's spec sheet and the AV
screen-luminance references without reproduction);
`test/fixtures/worked-examples.json` (every pinned example and cross-check);
`test/fixtures/compute-map.js` (module path `../../calc-stage.js`);
`scripts/related-tiles.mjs` (`led-video-wall` -> `power-distro` / `truss-capacity` /
`projector-brightness`; `projector-brightness` -> `led-video-wall` / `lighting-beam`);
`data/search/aliases.json` (e.g. `led-video-wall`: "led wall", "video wall", "pixel
pitch", "led panel power", "viewing distance"; `projector-brightness`: "projector
lumens", "projection", "foot lamberts", "throw distance", "screen brightness"); the
`app.js` `STAGE_RENDERERS` declare gains both ids; the `// dims:` annotations; and the
regenerated v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins
both worked examples, the resolution-independent-of-pitch invariant, every `null`
optional-output branch, the average-power-factor-range seam, and every other error
seam.

**Module note.** `calc-stage.js` is the home of every Group N tile, so both land
there. It is at ~17.2 KB gzipped against an 18,500 B cap; the two tiles push it over,
so this spec **raises the `calc-stage.js` cap** in `scripts/check-module-sizes.mjs` to
about **20,500 B** (current plus the two tiles plus the documented ~15% headroom), the
documented-cap-bump pattern v51 already used for this module. If the as-built size
warrants it, the maintainer may instead split a Group N bench into a new module (the
spec-v70..v89 precedent); either way the module-size gate stays green. Group letter
(`N`) is independent of the module.

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate, including the module-size,
wiring, sw-precache, dimensions, corpus, tile-contract, and README-count gates;
`check-readme-counts` agrees at **642 tiles** and the matching sitemap URL count);
`npm test` (+2 worked-example fixtures and their cross-checks; the new bounds-fuzzer
block); `npm run build` (642 tile shells, regenerated sitemap); `npm run
data:verify`; the worked-examples runner; the 320 px shell audit (the resolution /
size / cabinet / power / weight / viewing-distance lines and the area / lumens / throw
lines all wrap, not scroll, on a phone); and the full-catalog render-no-nan Chromium
sweep plus the a11y gate, with the rendered output read to the value (168 x 168 px /
2.6 mm / 10 x 6 -> 1,680 x 1,008 px, 14.33 ft wide, 1,080 lb, 12 kW peak, 8.53 ft
minimum view; 16 x 9 ft / 16 fL -> 2,304 lumens, 24 ft throw).

## 5. Roadmap position

v92 opens the video side of Group N, linking the new tiles to the bench
(`led-video-wall` feeds its weight to the rigging tiles and its power to
`power-distro`; `projector-brightness` sits beside `lighting-beam` as the projection
analog of fixture photometry). Further growth should stay evidence-driven (a named
gap a video or lighting tech hits) -- candidates include a data/signal-run budget
(receiver cards and processor capacity per wall), a line-array coverage/SPL-by-throw
tile, and a gel/color-temperature mireds tile; none ships without the field need. The
standing module-cap watch adds `calc-stage.js` after this bump.
