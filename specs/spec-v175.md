# roughlogic.com Specification v175 -- Point-Method Illuminance (Inverse-Square + Cosine Law) (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.79.0; part of catalog 628 -> 639). Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile computing horizontal illuminance at a
> point from a luminaire of known candlepower using the inverse-square and cosine laws -- the
> point-by-point method, complementing the existing zonal-cavity lumen method. Adds one tile to
> **`calc-elecdesign.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog covers average illuminance via the lumen/zonal
> method (`lumen-method`, `lighting-density`) and converts lux/footcandles (`lux-to-footcandle`), but
> never the point method an electrician uses to check the footcandles directly under or beside a single
> fixture (a wallpack at a door, a high-bay aisle, a security light). That is the inverse-square law
> with a cosine term, and there is no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
luminous intensity is candela (`dimensionless` luminous-intensity unit, carried as cd), the mounting
height and distance are `L` (ft), the angle is in degrees, and the illuminance result is footcandles
(`L^-2` luminous flux density, carried as fc; lumens per square foot). The v18/v21 contract: any
non-finite input, a non-positive intensity, a non-positive mounting height, or an angle outside 0-90
deg returns `{ error }`; the only division is by the guarded-positive squared distance. Citation
discipline (v19/v22): `GOVERNANCE.electrical`, edition `IES Lighting Handbook / IESNA point method
(inverse-square and cosine laws)`, `editionNote` `NEC_DISCLOSURE`, with the note that the result is
the *direct* horizontal illuminance from one source ignoring interreflection, that lux = fc x 10.764
for SI users (cross-reference `lux-to-footcandle`), and that a design relies on the manufacturer's
photometric file.

## 2. The tile

### 2.1 `point-illuminance` -- Horizontal Illuminance at a Point (Point Method)

```
inputs:
  intensity_cd        cd    luminous intensity of the source toward the point (candela)
  mount_height_ft     L     vertical mounting height above the work plane
  angle_deg           deg   angle from straight-down (nadir) to the point (0 = directly below)

distance_ft   = mount_height_ft / cos(angle_deg)            # slant distance source-to-point
e_fc          = intensity_cd x cos(angle_deg) / distance_ft^2
# equivalently  e_fc = intensity_cd x cos(angle_deg)^3 / mount_height_ft^2
e_lux         = e_fc x 10.764
```

**Pinned worked example.** A 1,000 cd source 10 ft above the work plane, point directly below
(angle 0 deg): `distance = 10 / cos(0) = 10 ft`; `e = 1,000 x cos(0) / 10^2 = 1,000 / 100 = 10.0 fc`
(108 lux). **Cross-check (off-axis).** The same source, point at 30 deg off nadir:
`distance = 10 / cos(30) = 11.55 ft`; `e = 1,000 x cos(30) / 11.55^2 = 1,000 x 0.866 / 133.4 =
6.49 fc` (69.9 lux) -- equivalently `1,000 x cos(30)^3 / 100 = 6.49 fc`. Illuminance falls off with
both distance squared and the cosine of the angle. The manufacturer's photometric file and the IES
target govern.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, IES point method, the inverse-square and cosine laws
and the fc/lux factor listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`point-illuminance` -> `computePointIlluminance` in `../../calc-elecdesign.js`);
`scripts/related-tiles.mjs` (-> `lumen-method` / `lux-to-footcandle` / `lighting-density`);
`data/search/aliases.json` ("point method", "inverse square", "illuminance at a point", "candela to
footcandle", "footcandle calculation", "cosine law lighting"); the id appended to the existing
`ELECDESIGN_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the nadir example, the off-axis cross-check, and
error seams (non-finite, intensity <= 0, height <= 0, angle outside 0-90). Raise the
`calc-elecdesign.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the off-axis path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the slant
distance, fc, and lux lines wrap on a phone); render-no-nan + a11y sweep, output read to the value
(1,000 cd / 10 ft / 0 deg -> 10.0 fc; 30 deg -> 6.49 fc).

## 5. Roadmap position

Adds the point method to the lighting family (`lumen-method`, `lighting-density`,
`lux-to-footcandle`). Further Group A growth stays evidence-driven.
