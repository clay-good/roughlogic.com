# roughlogic.com Specification v863 -- Single-Ply Membrane Roof Rolls and Seam Length (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v862.md. Roofing sweep, beside `roofing-squares` and
> `metal-roof-panels`.
>
> **The gap, and the evidence for it.** The catalog counts shingle bundles and metal panels but nothing takes off a
> **single-ply membrane** (TPO / EPDM / PVC) -- the rolls, where the side lap eats the usable width, and the seam length
> that sizes the welding and labor. Grep confirmed no membrane tile. The number this settles: an 8,000 sf roof on 10 ft x
> 100 ft rolls with a 6 in side lap takes **9 rolls** and about **842 LF** of seam -- the material and the welding day.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
roofing siblings (`roofing-squares`, `metal-roof-panels`): the roof area carries `L^2`, the roll width, length, side lap,
and usable width carry `L`, the waste percent is dimensionless, the roll count is dimensionless, and the seam length is
`L`. The v18/v21 contract: a non-finite or non-positive roof area, roll width, or roll length returns `{ error }`; a side
lap at or above the roll width (non-positive usable width) returns `{ error }`; a negative waste returns `{ error }`.
Citation discipline (v19/v22): the membrane-takeoff identity by name (usable width = roll width - side lap; rolls =
ceil(area x (1 + waste) / (usable width x roll length)); seam = area / usable width), `GOVERNANCE.general`; the note states
that the usable width nets out the side lap, that the seam length sizes the hot-air welding or adhesive and the labor,
that fasteners, plates, and cover tape are taken off separately, and that the membrane and lap are set by the manufacturer
and the wind uplift design.

## 2. The tile

### 2.1 `membrane-roof-takeoff` -- Single-Ply Membrane Roof Rolls and Seam Length

```
inputs:
  roof_area_sf    roof area (ft^2)
  roll_width_ft   membrane roll width (ft, default 10)
  roll_length_ft  membrane roll length (ft, default 100)
  sidelap_in      side lap (in, default 6)
  waste_pct       waste allowance (percent, default 5)

usable_w_ft = roll_width_ft - sidelap_in/12
rolls       = ceil(roof_area_sf * (1 + waste_pct/100) / (usable_w_ft * roll_length_ft))
seam_lf     = roof_area_sf / usable_w_ft
```

**Pinned worked example.** Roof 8,000 sf, 10 ft x 100 ft rolls, 6 in side lap, 5% waste:
`usable = 10 - 0.5 = 9.5 ft`; `rolls = ceil(8000*1.05 / (9.5*100)) = ceil(8.84) = ` **9**; `seam = 8000 / 9.5 = ` **842 LF**.
Cross-check: a wider 12 ft roll gives `usable = 11.5 ft`, `ceil(8400/1150) = ` **8 rolls** and `8000/11.5 = ` **696 LF** of
seam -- a wider sheet cuts both the rolls and the welding.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing"]`, inside the `// Group E` construction block beside
`metal-roof-panels`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (rolls = ceil(area(1+waste)/(usable x length)); seam = area/usable, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the wider-roll cross-check); `test/fixtures/compute-map.js`
(`membrane-roof-takeoff` -> `computeMembraneRoofTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `roofing-squares` / `metal-roof-panels` / `roof-underlayment-rolls`); `data/search/aliases.json` (5 collision-checked
aliases: "membrane roof takeoff", "tpo roll count", "epdm rolls", "single ply membrane", "roof membrane seam length"); a
hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `metal-roof-panels` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the usable width, roll count, seam length, and the error seams (non-positive area, roll width, roll length; side lap >=
width; negative waste). The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells`
and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,311 -> 1,312.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(8000*1.05/(9.5*100)) -> 9 rolls, 842 LF seam).

## 5. Roadmap position

Roofing takeoff beside the shingle and metal-panel tiles, serving the commercial roofer (roofing). Stays evidence-driven;
the manufacturer and uplift design set the lap.
