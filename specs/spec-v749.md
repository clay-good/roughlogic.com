# roughlogic.com Specification v749 -- Infinite Slope Critical Depth for a Target FS (calc-geotech.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-geotech.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v748.md. Explore sweep #14 (entry 4).
>
> **The gap, and the evidence for it.** The `slope-stability-infinite` tile runs the infinite-slope model forward: from a
> failure-plane depth it returns the factor of safety. The screening question is the inverse -- **the critical depth at
> which the FS drops to a target**. From `FS = (c' + gamma H cos^2 beta tan phi') / (gamma H sin beta cos beta)`,
> `H = c' / (gamma cos beta (FS sin beta - cos beta tan phi'))`. Because FS falls with depth toward the cohesionless limit
> `tan phi'/tan beta`, a finite critical depth exists only for `c' > 0` and a target above that limit. The number this
> settles: a **25 degree** cut in **c' 200 psf, phi' 30, gamma 120** soil reaches **FS 1.5** at about **16.6 ft** deep.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`slope-stability-infinite` sibling: the slope and friction angles and target FS are dimensionless, the cohesion is
`M L^-1 T^-2` (psf), the unit weight is `M L^-2 T^-2` (pcf), and the returned depth is `L` (ft). It reuses the sibling's
infinite-slope relation, solved for the depth. The v18/v21 contract: any non-finite input, a slope angle outside (0, 90), a
friction angle outside [0, 90), a non-positive unit weight, or a non-positive target FS returns `{ error }`; a
**non-positive cohesion** (a cohesionless slope has a depth-independent FS, no critical depth) returns an explanatory
`{ error }`; and a target FS **at or below the deep (cohesionless) limit** tan(phi')/tan(beta) (the slope holds that FS at
any depth) returns an explanatory `{ error }`. Citation discipline (v19/v22): the relation solved for the depth,
`GOVERNANCE.general` matching the sibling; the note states that cohesion helps most near the surface so **FS falls with
depth** toward tan(phi')/tan(beta), that a soil deeper than the critical depth falls below the target FS, and that this is
a **translational, no-seepage screening aid** with the geotechnical engineer of record governing.

## 2. The tile

### 2.1 `slope-failure-depth-for-fs` -- Infinite Slope Critical Depth for a Target FS

```
inputs:
  beta_deg      dimensionless slope angle beta (deg, 0 < beta < 90)
  phi_deg       dimensionless effective friction angle phi' (deg, 0 <= phi < 90)
  c_psf         M L^-1 T^-2   effective cohesion c' (psf, must be > 0)
  gamma_pcf     M L^-2 T^-2   soil unit weight (pcf, > 0; default 120)
  target_fs     dimensionless target factor of safety (> deep limit tan phi'/tan beta)

deep_fs_limit     = tan(phi') / tan(beta)
critical_depth_ft = c' / (gamma cos(beta) (FS sin(beta) - cos(beta) tan(phi')))
```

**Pinned worked example.** beta = 25 deg, phi' = 30 deg, c' = 200 psf, gamma = 120 pcf, target FS = 1.5:
`deep limit = tan(30)/tan(25) = 1.238`, `H = 200 / (120 x cos(25) x (1.5 sin(25) - cos(25) tan(30))) = 200 / 12.03 = `
**16.6 ft**. Feeding 16.6 ft back through `slope-stability-infinite` at the same soil returns FS 1.5, the target. A lower
1.3 target FS reaches deeper (~52 ft), and a 1.2 target (below the 1.238 deep limit) has no critical depth.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction","carpentry"]`) placed beside `slope-stability-infinite` (Group E
is not exact-count audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (relation solved for the depth,
`GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`slope-failure-depth-for-fs` -> `computeSlopeFailureDepthForFs`);
`scripts/related-tiles.mjs` (-> `slope-stability-infinite` / `slope-stability-seepage` / `trench-slope`);
`data/search/aliases.json` (5 collision-checked question aliases: "slope failure depth", "how deep before slope fails",
...); the calc-geotech `GEOTECH_RENDERERS` map entry via the shared `_simpleRenderer` factory (five number fields) and the
id added to the calc-geotech declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeSlopeStabilityInfinite` across a beta/phi/c/gamma/FS sweep, the lower-FS-deeper monotonicity, the cohesionless and
below-deep-limit impossibilities, and the error seams. The calc-geotech.js gzip cap (23000 B, raised in spec-v748 for both
tiles) covers the addition. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home
tile count 1,197 -> 1,198.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 16.6 ft for a 25 deg cut at
FS 1.5).

## 5. Roadmap position

Pairs the forward slope tile (`slope-stability-infinite`, FS from the depth) with its inverse (the depth for an FS), the
two halves of the infinite-slope screen. Continues Explore sweep #14; further Group E geotech growth stays
evidence-driven.
