# roughlogic.com Specification v912 -- Dished Tank / Vessel Head Volume (calc-fab.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v911.md. Tank-fabrication geometry sweep,
> complementing the existing flat-end tank-gauging tile (calc-cross.js), which explicitly excludes dished heads.
>
> **The gap, and the evidence for it.** The catalog gauges a flat-end tank but its note says "dished or hemispherical
> heads hold more and need a head-type correction" -- and no tile supplies that correction. Grep confirmed no vessel-head
> tile. Tank fabricators and gaugers need the volume the two heads add. The number this settles: a 48 in ID 2:1
> semi-elliptical head holds **62.67 gal** (14,477 in^3) past the tangent line.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
`weld-metal-volume` head-type-select tile: the inside diameter, straight flange, and dish depth carry `L`, the head-type
selector is dimensionless, and the volumes carry `L^3`. The v18/v21 contract: a non-finite or non-positive inside
diameter, or a negative straight flange, returns `{ error }`; an unknown head type falls back to 2:1 elliptical
(fuzzer-safe). Citation discipline (v19/v22): the dished-head volume geometry by name (2:1 semi-elliptical = pi D^3/24;
hemispherical = pi D^3/12; ASME flanged-and-dished ~ 0.0847 D^3; straight flange = pi/4 D^2 x length; gallons = in^3/231),
`GOVERNANCE.general`; the note states that the elliptical and hemispherical volumes are exact solids of revolution, that
the F&D figure is a standard-geometry approximation whose exact value needs the actual crown and knuckle radii, that two
heads make a tank's end allowance beyond the straight shell, and that the head manufacturer's stamped dimensions govern.

## 2. The tile

### 2.1 `vessel-head-volume` -- Dished Tank / Vessel Head Volume

```
inputs:
  inside_diameter_in  head inside diameter (in)
  head_type           2:1 semi-elliptical | ASME flanged & dished | hemispherical
  straight_flange_in  straight-flange (skirt) length (in, default 0)

coef              = { elliptical: pi/24, fd: 0.0847, hemispherical: pi/12 }[head_type]
head_volume_in3   = coef x D^3
straight_flange   = pi/4 x D^2 x straight_flange_in
total_volume_gal  = (head_volume_in3 + straight_flange) / 231
head_depth_in     = D/4 (elliptical) | 0.169 D (F&D) | D/2 (hemispherical)
```

**Pinned worked example.** 48 in ID, 2:1 semi-elliptical, no flange:
`head = pi x 48^3 / 24 = ` **14,477 in^3 = 62.67 gal**; dish depth `48/4 = ` 12 in. Cross-check: the same 48 in ID as a
**hemispherical** head is `pi x 48^3 / 12 = ` **125.34 gal** (twice the elliptical, depth 24 in), and as a standard
**F&D** head about `0.0847 x 48^3 = ` **40.5 gal** -- the head type more than triples the end volume for the same
diameter. A 2 in straight flange adds `pi/4 x 48^2 x 2 = ` 15.67 gal.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["fabrication", "welding"]`, beside `barstock-cutlist`); a `tile-meta.js`
`_TILES` entry (`E`); a `citations.js` entry (dished-head geometry, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the elliptical example plus the hemispherical cross-check, pinning the head volume
in^3 and gallons); `test/fixtures/compute-map.js` (`vessel-head-volume` -> `computeVesselHeadVolume`, module
`../../calc-fab.js`); `scripts/related-tiles.mjs` (-> `rolled-blank` / `metal-weight` / `coil-length`);
`data/search/aliases.json` (5 collision-checked aliases: "vessel head volume", "dished head volume", "tank head volume",
"elliptical head volume", "hemispherical head volume"), then `node scripts/build-alias-shards.mjs`; a hand-written
renderer in the `FAB_RENDERERS` map with a head-type `makeSelect` (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-fab declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the three head-type volumes, the straight
flange, the unknown-type fallback, and the error seams (non-positive diameter, negative flange, non-finite). The
calc-fab.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build.
Lazy-loaded, absent from home first paint. Home tile count 1,360 -> 1,361.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(pi x 48^3 / 24 -> 14,477 in^3 = 62.67 gal).

## 5. Roadmap position

Tank-fabrication geometry beside `barstock-cutlist`, serving the fabricator / welder (fabrication / welding). Deliberately
geometry; the head maker's stamped crown and knuckle radii govern the exact volume. Stays evidence-driven. Continues the
fabrication material / geometry sweep at 1 new spec (v912).
