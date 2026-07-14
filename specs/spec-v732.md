# roughlogic.com Specification v732 -- Cutter Diameter for a Spindle RPM (calc-machining.js, Group K, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v731.md. Explore sweep #12 (entry 2).
>
> **The gap, and the evidence for it.** The `cutting-speed-rpm` tile runs the speeds-and-feeds geometry forward: from a
> surface speed and a diameter it returns the spindle RPM. The shop question is the inverse -- **what diameter runs at a
> target (or the machine's maximum) spindle RPM** for a given surface speed. From `RPM = 12 x SFM / (pi x diameter)`,
> `diameter = 12 x SFM / (pi x RPM)`. The number this settles: **100 SFM** at **1,000 RPM** is a **0.382 in** diameter.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`cutting-speed-rpm` sibling: the surface speed is `L T^-1` (SFM), the spindle speed is `T^-1` (RPM), and the returned
diameter is `L` (in). It reuses the sibling's first-principles cutting geometry, solved for the diameter. The v18/v21
contract: any non-finite input, a non-positive surface speed, or a non-positive RPM returns `{ error }`. Citation
discipline (v19/v22): the RPM identity solved for the diameter, `GOVERNANCE.general` matching the sibling; the note states
that because a larger diameter turns **slower** at a fixed SFM, a machine RPM ceiling sets the **smallest** cutter that
still reaches the full surface speed (a smaller one tops out the spindle first and runs under-speed), that the diameter is
the **cutter/drill** for milling/drilling and the **workpiece** for turning, and that the **SFM comes from the tool /
material chart** with the machine and rigidity governing.

## 2. The tile

### 2.1 `cutting-diameter-for-rpm` -- Cutter Diameter for a Spindle RPM

```
inputs:
  surface_speed_sfm   L T^-1   surface speed (SFM, > 0)
  target_rpm          T^-1     target or maximum spindle RPM (> 0)

diameter_in = 12 x surface_speed_sfm / (pi x target_rpm)
```

**Pinned worked example.** SFM = 100, RPM = 1,000:
`diameter = 12 x 100 / (pi x 1000) = 1200 / 3141.6 = ` **0.382 in** (9.70 mm). Feeding 0.382 in back through
`cutting-speed-rpm` at 100 SFM returns 1,000 RPM, the input. Doubling the RPM ceiling to 2,000 halves the diameter to
0.191 in -- a smaller cutter needs the higher spindle speed to reach the same surface speed.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["mechanic","machinist"]`) placed beside `cutting-speed-rpm` in the later
spec-v76 machining section, well past the Group K exact-count audit block; a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (RPM identity solved for the diameter, `GOVERNANCE.general` matching the sibling);
`test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js` (`cutting-diameter-for-rpm` ->
`computeCuttingDiameterForRpm`); `scripts/related-tiles.mjs` (-> `cutting-speed-rpm` / `drill-point-depth` /
`drill-point-angle-from-length`); `data/search/aliases.json` (5 collision-checked question aliases: "diameter for rpm",
"max cutter diameter", ...); the calc-machining `MACHINING_RENDERERS` map entry via a hand-written renderer (two number
fields) and the id added to the calc-machining declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the
round-trip through `computeCuttingSpeed` across an SFM/RPM sweep, the higher-RPM-smaller-diameter and
higher-SFM-larger-diameter monotonicity, and the error seams. The calc-machining.js gzip cap (18000 B, raised in
spec-v729) holds. Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count
1,180 -> 1,181.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 0.382 in for 100 SFM at
1,000 RPM).

## 5. Roadmap position

Pairs the forward speed tile (`cutting-speed-rpm`, RPM from the diameter) with its inverse (the diameter for an RPM), the
two halves of the speeds-and-feeds question. Continues Explore sweep #12; further Group K machining growth stays
evidence-driven.
