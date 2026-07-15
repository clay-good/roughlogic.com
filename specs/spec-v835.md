# roughlogic.com Specification v835 -- Frame Scaffold Material Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v834.md. Temporary-works sweep, beside
> `scaffold-leg-load` and `scaffold-mudsill-bearing`.
>
> **The gap, and the evidence for it.** Nothing counts the **frame scaffold** components for a run -- the frames, cross
> braces, planks, and base plates that come off the bay layout and the number of lifts. Grep confirmed no scaffold-takeoff
> tile. The number this settles: a 40 ft run on 7 ft bays, three lifts high, is **6 bays** -- **21 frames**, **36 braces**,
> **24 planks**, and **14 base plates** -- the load list before the truck is ordered.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
takeoff siblings: the run length and bay length carry `L`, and every component count (bays, frames, braces, planks, base
plates) is dimensionless. The v18/v21 contract: a non-finite or non-positive run length, bay length, lifts, or
planks-per-bay returns `{ error }`. Citation discipline (v19/v22): the frame-scaffold takeoff geometry by name (bays =
ceil(run / bay length); frames = (bays + 1) x lifts; braces = 2 x bays x lifts; base plates = (bays + 1) x 2),
`GOVERNANCE.general`; the note states that the counts are for a single-width frame run, that guardrails, ties, screw
jacks, and access (ladders / stair towers) are taken off separately, and that a competent person designs the erection.

## 2. The tile

### 2.1 `scaffold-takeoff` -- Frame Scaffold Material Takeoff

```
inputs:
  run_length_ft  scaffold run length (ft)
  bay_length_ft  bay / cross-brace length (ft, default 7)
  lifts          number of frame levels high (count, default 1)
  planks_per_bay planks per bay platform (count, default 4)

bays        = ceil(run_length_ft / bay_length_ft)
frames      = (bays + 1) * lifts
braces      = 2 * bays * lifts
planks      = bays * planks_per_bay
base_plates = (bays + 1) * 2
```

**Pinned worked example.** Run 40 ft, 7 ft bays, 3 lifts, 4 planks/bay:
`bays = ceil(40/7) = ` **6**; `frames = (6+1)*3 = ` **21**; `braces = 2*6*3 = ` **36**; `planks = 6*4 = ` **24**;
`base plates = (6+1)*2 = ` **14**. Cross-check: raising it to 5 lifts leaves the bays at 6 but takes `(6+1)*5 = ` **35
frames** and `2*6*5 = ` **60 braces** -- height multiplies the frames and braces, not the footprint.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block beside
`scaffold-leg-load`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (bays = ceil(run/bay); frames = (bays+1) x lifts; braces = 2 x bays x lifts, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the taller cross-check); `test/fixtures/compute-map.js`
(`scaffold-takeoff` -> `computeScaffoldTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `scaffold-leg-load` / `scaffold-mudsill-bearing` / `material-quantity`); `data/search/aliases.json` (5
collision-checked aliases: "scaffold takeoff", "scaffold material count", "frame scaffold estimate", "scaffold frames
braces", "scaffold bay count"); a hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring a count renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the bay, frame, brace, plank, and base-plate counts and the error seams
(non-positive run, bay, lifts, planks-per-bay). The calc-construction.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,283 -> 1,284.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(40/7) -> 6 bays, 21 frames, 36 braces).

## 5. Roadmap position

Completes the scaffold trio (`scaffold-leg-load`, `scaffold-mudsill-bearing`, `scaffold-takeoff`): capacity, foundation,
and material count. Serves the scaffold erector and estimator (construction / carpentry). Stays evidence-driven; a
competent person designs the erection.
