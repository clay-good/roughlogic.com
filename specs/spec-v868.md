# roughlogic.com Specification v868 -- Light-Gauge Steel Stud and Track Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v867.md. Drywall / steel-framing sweep, beside
> `drywall` and `residential-framing`.
>
> **The gap, and the evidence for it.** `residential-framing` rolls up wood but nothing takes off **light-gauge steel
> studs and track** for a partition. Grep confirmed no metal-stud tile. The number this settles: a 50 ft partition at 16 in
> on center with two door openings is **43 studs** and **100 LF** of track -- the framing order for a commercial interior.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
framing siblings (`residential-framing`, `drywall`): the wall length and spacing carry `L`, the opening count and
extra-per-opening are dimensionless, the stud count is dimensionless, and the track length is `L`. The v18/v21 contract: a
non-finite or non-positive wall length or spacing returns `{ error }`; a negative opening count or extra-per-opening
returns `{ error }`. Citation discipline (v19/v22): the takeoff identity by name (studs = ceil(wall / spacing) + 1 +
openings x extra; track = 2 x wall), `GOVERNANCE.general`; the note states that this is light-gauge steel framing, that
extra studs go at openings (jack, king, cripple), corners, and wall intersections (entered as the opening allowance), that
the track is the top and bottom runners (twice the wall length), and that this is distinct from the wood
`residential-framing`.

## 2. The tile

### 2.1 `metal-stud-takeoff` -- Light-Gauge Steel Stud and Track Takeoff

```
inputs:
  wall_length_ft    partition length (ft)
  spacing_in        stud spacing (in, default 16)
  openings          door/window openings (count)
  extra_per_opening extra studs per opening (count, default 2)

studs    = ceil(wall_length_ft / (spacing_in/12)) + 1 + openings * extra_per_opening
track_lf = 2 * wall_length_ft
```

**Pinned worked example.** Wall 50 ft, 16 in spacing, 2 openings, 2 extra each:
`studs = ceil(50/(16/12)) + 1 + 2*2 = 38 + 1 + 4 = ` **43**; `track = 2*50 = ` **100 LF**. Cross-check: at 24 in on center
the field studs drop to `ceil(50/2) + 1 = 26`, so `26 + 4 = ` **30 studs** on the same 100 LF of track -- the spacing sets
the field count, the openings add on top.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["drywall", "carpentry"]`, inside the `// Group E` construction block near
`drywall`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js`
entry (studs = ceil(wall/spacing)+1+openings x extra; track = 2 x wall, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wider-spacing cross-check); `test/fixtures/compute-map.js`
(`metal-stud-takeoff` -> `computeMetalStudTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `drywall` / `residential-framing` / `suspended-ceiling-grid`); `data/search/aliases.json` (5 collision-checked
aliases: "metal stud takeoff", "steel stud count", "light gauge framing", "stud and track takeoff", "partition stud
count"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `drywall` count renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the stud count, the track length, and the error seams (non-positive wall or spacing;
negative openings or extra). The calc-construction.js gzip cap is watched at build. Verify at build, including
`check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,316 -> 1,317.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(50/(16/12)) + 1 + 4 -> 43 studs, 100 LF track).

## 5. Roadmap position

Steel-framing takeoff beside `drywall` and the wood `residential-framing`, serving the drywall / interior framer (drywall
/ carpentry). Next candidate: suspended acoustical ceiling grid. Stays evidence-driven; the plans set the spacing.
