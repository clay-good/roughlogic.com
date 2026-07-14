# roughlogic.com Specification v692 -- Driveshaft Max Length for an Operating Speed (calc-mechanic.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-mechanic.js`** (Group K,
> mechanic), no new module, group, or dependency. Inherits spec.md through spec-v691.md.
>
> **The gap, and the evidence for it.** Spec-v (`driveshaft-crit`) runs the Euler-Bernoulli whirl relation forward:
> given a tube length, it returns the first-mode critical speed. The driveline-design question is the inverse -- **how
> long can I make this tube before it whips at my operating speed**. The forward tile makes you guess lengths and re-read
> the critical speed against the running RPM; the inverse solves it directly. Because the first-mode critical speed falls
> as `1/length^2`, `L_max = L_ref x sqrt(0.65 x N_crit_ref / target_rpm)`, keeping the running speed at or below 0.65 of
> critical. The number this settles: a 3.5 in x 0.083 in steel tube running at its 2,800 RPM safe limit maxes at **50
> in**; halve the RPM and it can grow 41% (sqrt(2)) to **71 in** -- which is why a long run is split with a center support
> bearing or built from a larger, stiffer, or composite tube.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`driveshaft-crit` sibling: it reuses the sibling's `SHAFT_MATERIALS` table (calling `computeDriveshaftCritical` at a
reference length to extract the geometry constant), the material select, the OD and wall are `L` (in), the target and
critical speeds are `T^-1` (RPM), and the returned length is `L`. It reuses the sibling's `0.65` operating-margin factor.
The v18/v21 contract: any non-finite input, a non-positive target RPM, or any error the forward raises (unknown
material, non-positive OD, wall >= OD/2) propagates as `{ error }`. Citation discipline (v19/v22): the Euler-Bernoulli
critical-speed relation solved for length, `GOVERNANCE.general` matching the sibling; the note states that **the
first-mode critical speed scales as 1/length^2, the running speed is kept at or below 0.65 of critical (guidance
0.6-0.75), halving the RPM lets the shaft grow by sqrt(2), and this is a bare-tube estimate (the yokes, slip joint,
balance, and support bearings shift the real critical speed) -- the driveline manufacturer and a whirl analysis
govern**.

## 2. The tile

### 2.1 `driveshaft-max-length` -- Driveshaft Max Length for an Operating Speed

```
inputs:
  target_rpm   RPM   operating speed (> 0)
  od_in        in    tube outer diameter (> 0)
  wall_in      in    tube wall thickness, < OD/2
  material     -     steel / aluminum / carbon

N_crit(L) scales as 1/L^2 (Euler-Bernoulli first mode)
L_max = L_ref x sqrt(0.65 x N_crit_ref / target_rpm)   [in]   (running at 0.65 of critical)
critical_rpm at L_max = target_rpm / 0.65
```

**Pinned worked example (a steel tube).** target = 3,040.7 RPM (the 48 in safe limit), OD = 3.5 in, wall = 0.083 in,
steel: the geometry gives `N_crit_ref` at a reference length, and `L_max = ` **48 in**; feeding 48 in back through
`driveshaft-crit` returns a recommended-max speed of 3,040.7 RPM, the input. **Cross-check (half the speed).** Same tube
at half the RPM (1,520.4): `L_max = 48 x sqrt(2) = ` **67.9 in** -- the lower running speed lets the tube grow 41%.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic"]`) placed in the LATER Group K section beside `screw-conveyor-rpm`,
NOT beside `driveshaft-crit` in the original block -- the Group K audit-coverage test asserts exactly 12 ids in the
`// Group K: Mechanic`..`// Group L` block, so the row must stay out of it; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (critical-speed relation solved for length, `GOVERNANCE.general` matching the sibling, the note per
§1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`driveshaft-max-length` ->
`computeDriveshaftMaxLength` in `../../calc-mechanic.js`); `scripts/related-tiles.mjs` (-> `driveshaft-crit` /
`shaft-torsion` / `displacement-cr`, and the forward tile links back); `data/search/aliases.json` ("max driveshaft
length for an rpm", "longest driveshaft before it whips", "how long a tube before critical speed", plus adjacent rows);
the calc-mechanic RENDERERS map entry `"driveshaft-max-length": renderDriveshaftMaxLength` via the module's
`_simpleRenderer` factory with a material select (the select feeds the compute, satisfying check-dead-inputs) and the id
added to the calc-mechanic declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the sqrt(2)-at-half-RPM
relation, the round-trip through `computeDriveshaftCritical` across materials, and the error seams. The calc-mechanic.js
gzip cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 48 in max at the 3,040.7 RPM safe limit).

## 5. Roadmap position

Pairs the forward driveshaft tile (`driveshaft-crit`, critical speed from length) with its inverse (max length from an
operating speed), the two halves of the whirl-limit question. Further Group K growth stays evidence-driven.
