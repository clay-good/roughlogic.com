# roughlogic.com Specification v938 -- Wire-Rope Clip Count and Spacing (OSHA Table H-2) (calc-rigging.js, Group Z, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z),
> no new module, group, or dependency. Inherits spec.md through spec-v937.md. Rigging hardware field-reference sweep,
> beside the accepted `shackle-eyebolt-wll` and `sling-angle` tiles. OSHA Table H-2 values web-verified against 29 CFR
> 1926.251.
>
> **The gap, and the evidence for it.** The catalog has sling and shackle ratings but nothing counts the U-bolt clips to
> form a wire-rope eye. Grep confirmed no clip tile. Every field-formed eye is policed against OSHA Table H-2. The number
> this settles: a 3/4 in wire rope takes **4 clips** at **4.5 in** (6 x the diameter) on center.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling rigging
tiles: the rope diameter, spacing, and tail carry `L`, and the clip count is dimensionless. The v18/v21 contract: a
non-finite or non-positive rope diameter returns `{ error }`. Citation discipline (v19/v22): the OSHA Table H-2 clip rule
by name (count by diameter; spacing = 6 x diameter), `GOVERNANCE.rigging`; the note states that the U-bolt (saddle) bears
on the DEAD end and the base on the LIVE end ("never saddle a dead horse"), that the nuts are torqued to the maker's
value and re-torqued after the first load, that OSHA lists no count below 1/2 in (2 clips is the common manufacturer
minimum), that a clip eye develops only about 80% of the rope's strength, and that the clip and rope manufacturer and
OSHA govern the termination.

## 2. The tile

### 2.1 `wire-rope-clips` -- Wire-Rope Clip Count and Spacing (OSHA Table H-2)

```
inputs:
  rope_diameter_in   wire rope diameter (in)

clip_count = OSHA Table H-2 by diameter:
             < 1/2 -> 2 (manufacturer); 1/2 & 5/8 -> 3; 3/4 & 7/8 -> 4; 1 -> 5;
             1-1/8 & 1-1/4 -> 6; 1-3/8 & 1-1/2 -> 7; > 1-1/2 -> 8
spacing_in     = 6 x rope_diameter_in
minimum_tail_in = clip_count x spacing_in   (approximate turnback past the thimble)
```

**Pinned worked example.** 3/4 in wire rope:
`clips = ` **4** (OSHA Table H-2); `spacing = 6 x 0.75 = ` **4.5 in** on center. Cross-check: a 1/2 in rope takes `3`
clips at `6 x 0.5 = 3.0 in`, and a 1 in rope takes `5` clips at `6.0 in` -- the count steps with the diameter per the
federal table and the spacing is always six diameters.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`, beside `beam-clamp-side-pull`); a `tile-meta.js` `_TILES` entry
(`Z`); a `citations.js` entry (OSHA Table H-2 clip rule, `GOVERNANCE.rigging`); `test/fixtures/worked-examples.json` (the
3/4 in example plus the 1/2 in and 1 in cross-check, pinning the clip count and spacing); `test/fixtures/compute-map.js`
(`wire-rope-clips` -> `computeWireRopeClips`, module `../../calc-rigging.js`); `scripts/related-tiles.mjs` (->
`shackle-eyebolt-wll` / `sling-angle` / `bridle-leg-tension`); `data/search/aliases.json` (5 collision-checked aliases:
"wire rope clips", "how many wire rope clips", "u-bolt clips", "cable clip spacing", "never saddle a dead horse"), then
`node scripts/build-alias-shards.mjs`; a hand-written renderer in the `RIGGING_RENDERERS` map (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-rigging declare list in `app.js`; the `// dims:` annotation directly
above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the
clip count across the table steps, the 6 x diameter spacing, and the error seams (non-positive diameter, non-finite). The
calc-rigging.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,386 -> 1,387.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(3/4 in -> 4 clips at 4.5 in on center).

## 5. Roadmap position

Rigging hardware field-reference beside `shackle-eyebolt-wll`, serving the rigger (rigging). Deliberately applies the
OSHA table; the clip and rope manufacturer's instructions, the required torque, and OSHA govern the termination, and a
qualified person inspects it. Stays evidence-driven. Continues the rigging hardware reference sweep at 1 new spec (v938).
