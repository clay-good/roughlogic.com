# roughlogic.com Specification v886 -- Concrete Control-Joint Saw-Cut Footage (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v885.md. Concrete flatwork sweep, beside
> `control-joint-spacing`.
>
> **The gap, and the evidence for it.** `control-joint-spacing` gives the spacing but nothing gives the **saw-cut
> footage** for the joint grid it implies. Grep confirmed no saw-cut-footage tile. The number this settles: a 60 x 40 ft
> slab on a 12 ft grid is a 5 x 4 panel layout -- **340 LF** of saw cut -- the blade footage and the crew's morning after
> a pour.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`control-joint-spacing`, `concrete`): the slab length, width, and spacing carry `L`, the panel count is
dimensionless, and the joint footage is `L`. The v18/v21 contract: a non-finite or non-positive slab length, width, or
spacing returns `{ error }`. Citation discipline (v19/v22): the cut-footage identity by name (panels each way =
ceil(dimension / spacing); joint footage = (panels_L - 1) x width + (panels_W - 1) x length),
`GOVERNANCE.general`; the note states that the panels are sized with a ceiling so no panel exceeds the spacing, that the
spacing comes from `control-joint-spacing` (control joints run about 24 to 36 times the slab thickness apart), that the
cut is made early (a soft cut within hours or a conventional cut before shrinkage cracks), that the cut depth is about a
quarter of the slab thickness, and that this is distinct from `control-joint-spacing` which gives only the spacing.

## 2. The tile

### 2.1 `concrete-sawcut-footage` -- Concrete Control-Joint Saw-Cut Footage

```
inputs:
  length_ft   slab length (ft)
  width_ft    slab width (ft)
  spacing_ft  joint spacing (ft, default 12)

panels_l  = ceil(length_ft / spacing_ft)
panels_w  = ceil(width_ft / spacing_ft)
panels    = panels_l * panels_w
joint_lf  = (panels_l - 1) * width_ft + (panels_w - 1) * length_ft
```

**Pinned worked example.** Slab 60 x 40 ft, 12 ft spacing:
`panels_l = ceil(60/12) = 5`, `panels_w = ceil(40/12) = 4`, `panels = ` **20**;
`joint = (5-1)*40 + (4-1)*60 = 160 + 180 = ` **340 LF**. Cross-check: a tighter 10 ft grid gives `panels_l = 6`,
`panels_w = 4`, and `joint = 5*40 + 3*60 = 200 + 180 = ` **380 LF** -- tighter joints, more blade footage.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, inside the `// Group E` construction block beside
`control-joint-spacing`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (joint = (panels_L-1) x width + (panels_W-1) x length, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the tighter-grid cross-check); `test/fixtures/compute-map.js`
(`concrete-sawcut-footage` -> `computeConcreteSawcutFootage`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `control-joint-spacing` / `concrete` / `concrete-pour-rate`);
`data/search/aliases.json` (5 collision-checked aliases: "concrete saw cut footage", "control joint cut length", "slab
saw cut linear feet", "joint saw cut takeoff", "control joint footage"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring the `control-joint-spacing` renderer (non-exported, so no DOM-sentinel dims row),
and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the panel count and joint
footage and the error seams (non-positive length, width, spacing). The calc-construction.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,334 -> 1,335.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((5-1)*40 + (4-1)*60 -> 340 LF).

## 5. Roadmap position

Concrete flatwork tile beside `control-joint-spacing` (spacing) and `concrete-pour-rate`, serving the concrete finisher /
saw operator (concrete / construction). Stays evidence-driven; the joint layout governs.
