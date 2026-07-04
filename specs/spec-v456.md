# roughlogic.com Specification v456 -- Camera Lens Field of View and Pixel Density (IEC 62676-4 DORI) (calc-lowvoltage.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-04). First tile of a low-voltage systems trio (v456 camera lens FOV -> v457 ceiling speaker
> coverage -> v458 structured cabling channel). `cctv-storage` sizes the recording bandwidth and disk; nothing sizes the
> lens -- the field of view and the pixels-per-foot that decide whether a camera can detect, recognize, or identify a person
> at a given distance.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A surveillance camera's usefulness is set by its lens:
> the horizontal field of view is `FOV = 2 * atan(sensor_width / (2 * focal_length))`, the scene width at a distance is
> `distance * sensor_width / focal_length`, and the pixel density is `horizontal_pixels / scene_width`. The IEC 62676-4 DORI
> bands (detect, observe, recognize, identify) grade that density. `cctv-storage` covers the recorder, not the optics. This
> adds the lens tile to the existing **`calc-lowvoltage.js`** module (Group A); no new group, trade, or dependency. Inherits
> spec.md through spec-v455.md.
>
> **The gap, and the evidence for it.** A `1/2.8 in` sensor (`5.37 mm` wide) with a `4 mm` lens at `30 ft` sees a
> `30 * 5.37 / 4 = 40.3 ft`-wide scene, a `67.7 deg` horizontal field of view; a `1920`-pixel image over that width is
> `1920 / 40.3 = 47.7 pixels per foot`, which meets the DORI recognize threshold (`~38 ppf`) but not identify (`~76 ppf`).
> Zoom to an `8 mm` lens and the scene halves to `20.1 ft`, doubling the density to identify range. No tile does this; a
> designer picking a lens had the storage tile but not the coverage or pixel density.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The sensor width and focal
length are lengths (mm); the distance is a length (ft); the scene width is a length (ft); the horizontal pixels are
dimensionless; the pixel density is per length (px/ft); the field of view is an angle (deg, handled dimensionlessly). The
v18/v21 contract: any non-finite input, or a non-positive sensor width, focal length, distance, or pixel count, returns
`{ error }`; the tile reports the field of view, the scene width, the pixel density, and the DORI band it satisfies.
Citation discipline (v19/v22): `GOVERNANCE.general` over the camera coverage and DORI by name; `editionNote` names **the
horizontal field of view `2 * atan(sensor_width/(2*focal_length))`, the scene width `distance * sensor_width/focal_length`,
the pixel density `horizontal_pixels/scene_width`, and the IEC 62676-4 DORI thresholds (detect `~8`, observe `~19`,
recognize `~38`, identify `~76 px/ft`, from the `25/63/125/250 px/m` values)**, and states that **this returns the lens
coverage and pixel density for a surveillance camera, that lens distortion and mounting height are separate, and that it is
a design aid, not a substitute for a site camera test**.

## 2. The tile

### 2.1 `camera-lens-fov` -- Camera Lens Field of View and Pixel Density (DORI)

```
inputs:
  sensor_width_mm   mm   image sensor horizontal width
  focal_length_mm   mm   lens focal length
  distance_ft       ft   target distance
  h_pixels          -    horizontal resolution

fov_deg    = 2 * atan(sensor_width_mm / (2 * focal_length_mm))
scene_ft   = distance_ft * sensor_width_mm / focal_length_mm
ppf        = h_pixels / scene_ft
dori = ppf >= 76 ? "Identify" : ppf >= 38 ? "Recognize" : ppf >= 19 ? "Observe" : ppf >= 8 ? "Detect" : "below Detect"
```

**Pinned worked example (5.37 mm sensor, 4 mm lens, 30 ft, 1920 px).** `FOV = 67.7 deg`; scene `40.3 ft`;
`ppf = 1920/40.3 = 47.7`, meeting **Recognize** (`>= 38`) but not Identify. **Cross-check (a longer lens identifies).** An
`8 mm` lens halves the scene to `20.1 ft` and doubles the density to `95.4 ppf` -> **Identify**. A non-positive input takes
the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["low-voltage"]`, beside `cctv-storage`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, IEC 62676-4 DORI, `editionNote` naming the FOV, scene-width, pixel-density, and
DORI-threshold relations); `test/fixtures/worked-examples.json` (the 4 mm example + the 8 mm cross-check; the string DORI
band pins with `"tolerance": {"abs": 0}`); `test/fixtures/compute-map.js` (`camera-lens-fov` -> `computeCameraLensFov` in
`../../calc-lowvoltage.js`); `scripts/related-tiles.mjs` (-> `cctv-storage` / `fiber-loss-budget` / `poe-budget` /
`projector-brightness`); `data/search/aliases.json` ("camera lens fov", "field of view camera", "dori", "pixels per foot",
"camera coverage", "lens focal length fov", "surveillance camera lens", "ppf camera", "iec 62676"); the id appended to the
existing low-voltage renderers block in `app.js`; the `// dims:` annotation (sensor/focal length mm, distance/scene length,
pixels dimensionless, ppf per length); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the DORI bands, and the non-positive / non-finite error seams. No new module; re-pin `calc-lowvoltage.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the DORI assignment, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the FOV / scene / ppf set wraps on a phone);
render-no-nan + a11y sweep, output read to the value (5.37 mm, 4 mm, 30 ft -> 40.3 ft, 47.7 ppf, Recognize).

## 5. Roadmap position

Opens the low-voltage systems trio: `ceiling-speaker-coverage` (v457) and `structured-cabling-channel` (v458) continue the
systems theme. A vertical-FOV and a required-focal-length-for-a-target-DORI solver are the deliberate next follow-ons.
