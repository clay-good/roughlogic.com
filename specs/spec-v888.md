# roughlogic.com Specification v888 -- Drywall Screw Fastener Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v887.md. Drywall sweep, beside `drywall`.
>
> **The gap, and the evidence for it.** `drywall` counts sheets and mud but not the **screws**, where the framing spacing
> and the field pattern set the fastener count. Grep confirmed no drywall-fastener tile. The number this settles: 100
> sheets on 16 in framing at a 12 in field pattern is **36 screws a sheet** -- **3,600 screws** -- and a tighter 8 in
> pattern on a fire-rated or ceiling assembly runs it to 5,200.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
drywall siblings (`drywall`, `metal-stud-takeoff`): the sheet dimensions and spacings carry `L`, and the sheet, screws-per-
sheet, and total counts are dimensionless. The v18/v21 contract: a non-finite or non-positive sheet count, sheet length,
sheet width, stud spacing, or field spacing returns `{ error }`. Citation discipline (v19/v22): the fastener identity by
name (studs per sheet = floor(sheet width / stud spacing) + 1; screws per stud = floor(sheet length / field spacing) + 1;
total = sheets x studs per sheet x screws per stud), `GOVERNANCE.general`; the note states that the field spacing comes
from the code and the assembly (about 12 in on walls, 12 in or tighter on ceilings and fire-rated assemblies -- entered
here), that this counts fasteners only (the sheets and mud are in `drywall`), and that a collated auto-feed screw gun
tallies by the strip of about 50.

## 2. The tile

### 2.1 `drywall-fastener-takeoff` -- Drywall Screw Fastener Takeoff

```
inputs:
  sheets                sheet count (from drywall takeoff)
  sheet_length_ft       sheet length (ft, default 8)
  sheet_width_ft        sheet width (ft, default 4)
  stud_spacing_in       framing spacing (in, default 16)
  field_screw_spacing_in field screw spacing (in, default 12)

studs_per_sheet  = floor(sheet_width_ft*12/stud_spacing_in) + 1
screws_per_stud  = floor(sheet_length_ft*12/field_screw_spacing_in) + 1
screws_per_sheet = studs_per_sheet * screws_per_stud
total_screws     = sheets * screws_per_sheet
```

**Pinned worked example.** Sheets 100, 8 x 4 ft, 16 in framing, 12 in field:
`studs = floor(48/16)+1 = 4`; `screws/stud = floor(96/12)+1 = 9`; `screws/sheet = 4*9 = ` **36**;
`total = 100*36 = ` **3,600**. Cross-check: a tighter 8 in field pattern gives `screws/stud = floor(96/8)+1 = 13`,
`screws/sheet = 4*13 = 52`, and `100*52 = ` **5,200 screws** -- the field spacing, set by the assembly, drives the box
count.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["drywall", "carpentry"]`, inside the `// Group E` construction block beside
`drywall`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js`
entry (total = sheets x studs/sheet x screws/stud, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned
example plus the tight-pattern cross-check); `test/fixtures/compute-map.js` (`drywall-fastener-takeoff` ->
`computeDrywallFastenerTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `drywall` /
`metal-stud-takeoff` / `sheathing-takeoff`); `data/search/aliases.json` (5 collision-checked aliases: "drywall screw
takeoff", "drywall fastener count", "sheetrock screws", "drywall screws per sheet", "gypsum board screws"); a
hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `drywall` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the screws per sheet and total and the error seams (non-positive sheets, sheet dims, spacings). The calc-construction.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,336 -> 1,337.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(100 * (floor(48/16)+1) * (floor(96/12)+1) -> 3,600 screws).

## 5. Roadmap position

Drywall fastener takeoff beside `drywall` (sheets, mud) and `metal-stud-takeoff` (framing), serving the drywall hanger
(drywall / carpentry). Stays evidence-driven; the assembly sets the field spacing.
