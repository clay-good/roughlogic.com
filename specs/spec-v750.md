# roughlogic.com Specification v750 -- Luminaire Mounting Height for a Target Illuminance (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v749.md. Explore sweep #14 (entry 3).
>
> **The gap, and the evidence for it.** The `point-illuminance` tile runs the IES point method forward: from a mounting
> height it returns the illuminance. The layout question is the inverse -- **the mounting height that lands a target
> horizontal illuminance** at a point, given the candela and angle. From `E = I x cos^3(angle) / h^2`,
> `h = sqrt( I x cos^3(angle) / E )`. This solves for **height**, distinct from the existing
> `point-method-required-candela` tile that solves for the intensity. The number this settles: a **1,000 cd** source needs
> a **10 ft** mount for **10 fc** directly below.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`point-illuminance` sibling: the intensity is `J` (candela), the target illuminance is `L^-2` (fc), the angle is
dimensionless (deg), and the returned height and slant distance are `L` (ft). It reuses the sibling's inverse-square +
cosine point method, solved for the mounting height. The v18/v21 contract: any non-finite input, a non-positive intensity,
a non-positive target illuminance, or an angle outside [0, 90) returns `{ error }`. Citation discipline (v19/v22): the
point method solved for the height, `GOVERNANCE.electrical` matching the sibling; the note states that a **higher mount
lowers the illuminance** (mount lower to raise it), that this is the **direct illuminance from one source** (ignoring
interreflection and other luminaires, so the real design sums many sources and applies the light-loss factor), and that
the candela comes from the **photometric file** with the IES target governing.

## 2. The tile

### 2.1 `luminaire-height-for-illuminance` -- Luminaire Mounting Height for a Target Illuminance

```
inputs:
  intensity_cd   J             luminous intensity toward the point (candela, > 0)
  target_fc      L^-2          target horizontal illuminance (fc, > 0)
  angle_deg      dimensionless angle from nadir (deg, 0 <= angle < 90)

cosA            = cos(angle_deg)
mount_height_ft = sqrt( intensity_cd x cosA^3 / target_fc )
distance_ft     = mount_height_ft / cosA
```

**Pinned worked example.** intensity = 1,000 cd, target = 10 fc, angle = 0:
`h = sqrt( 1000 x 1 / 10 ) = sqrt(100) = ` **10 ft**, slant distance 10 ft. Feeding 10 ft back through `point-illuminance`
at 1,000 cd returns 10 fc, the target. Quadrupling the candela to 4,000 doubles the height to 20 ft for the same 10 fc.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) placed beside `point-illuminance` (Group A is not exact-count
audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (point method solved for the height,
`GOVERNANCE.electrical` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`luminaire-height-for-illuminance` -> `computeLuminaireHeightForIlluminance`);
`scripts/related-tiles.mjs` (-> `point-illuminance` / `point-method-required-candela` / `lumen-method`);
`data/search/aliases.json` (5 collision-checked question aliases: "mounting height for illuminance", "how high to mount
light", ...); the calc-elecdesign `ELECDESIGN_RENDERERS` map entry via the shared `_simpleRenderer` factory (three number
fields) and the id added to the calc-elecdesign declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computePointIlluminance` across a candela/fc/angle sweep, the more-candela-higher-mount and
higher-fc-lower-mount monotonicity, and the error seams. The calc-elecdesign.js gzip cap (raised to 14000 B in this spec)
covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,198 -> 1,199.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 10 ft for 10 fc from a
1,000 cd source).

## 5. Roadmap position

Pairs the forward point tile (`point-illuminance`, illuminance from the height) with its inverse (the height for an
illuminance), completing the point-method trio alongside the required-candela inverse. Continues Explore sweep #14;
further Group A lighting growth stays evidence-driven.
