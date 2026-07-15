# roughlogic.com Specification v877 -- Steel Roof / Floor Deck Sheet Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v876.md. Steel-erection sweep, beside
> `metal-roof-panels` and `metal-weight`.
>
> **The gap, and the evidence for it.** The catalog takes off exposed metal roof panels but nothing takes off **structural
> steel deck** -- the sheets by net cover width and length, and the side-lap run that sizes the fastening. Grep confirmed
> no metal-deck tile. The number this settles: 10,000 sf on a 36 in cover, 30 ft-long deck at 5% waste is **117 sheets**
> and about **3,333 LF** of side lap -- the deck order and the button-punch or weld run.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E steel
siblings (`metal-roof-panels`, `metal-weight`): the area and cover area carry `L^2`, the cover width and sheet length
carry `L`, the waste is dimensionless, the sheet count is dimensionless, and the side-lap run is `L`. The v18/v21
contract: a non-finite or non-positive area, cover width, or sheet length returns `{ error }`; a negative waste returns
`{ error }`. Citation discipline (v19/v22): the deck-takeoff identity by name (cover area = cover width x sheet length;
sheets = ceil(area x (1 + waste) / cover area); side lap = area / cover width), `GOVERNANCE.general`; the note states that
the cover width is the net coverage (not the overall sheet width), that the side-lap and support fastening (button punch,
screws, or welds with washers) follow the SDI and the drawings and are counted separately, and that this is distinct from
the exposed `metal-roof-panels`.

## 2. The tile

### 2.1 `metal-deck-takeoff` -- Steel Roof / Floor Deck Sheet Takeoff

```
inputs:
  area_sf         deck area (ft^2)
  cover_width_in  net cover width (in, default 36)
  sheet_length_ft sheet length (ft, default 30)
  waste_pct       waste allowance (percent, default 5)

cover_sf   = (cover_width_in/12) * sheet_length_ft
sheets     = ceil(area_sf * (1 + waste_pct/100) / cover_sf)
sidelap_lf = area_sf / (cover_width_in/12)
```

**Pinned worked example.** Area 10,000 sf, 36 in cover, 30 ft sheets, 5% waste:
`cover = (36/12)*30 = ` **90 sf**; `sheets = ceil(10000*1.05/90) = ceil(116.7) = ` **117**; `side lap = 10000/(36/12) = `
**3,333 LF**. Cross-check: a narrower 24 in cover deck has `cover = 60 sf`, `ceil(10500/60) = ` **175 sheets** and
`10000/2 = ` **5,000 LF** of side lap -- the narrower sheet means more sheets and more fastening.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block near
`metal-roof-panels`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (sheets = ceil(area(1+waste)/(cover x length)); side lap = area/cover, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the narrow-cover cross-check); `test/fixtures/compute-map.js`
(`metal-deck-takeoff` -> `computeMetalDeckTakeoff`, module `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `metal-roof-panels` / `metal-weight` / `welded-wire-mesh`); `data/search/aliases.json` (5 collision-checked aliases:
"metal deck takeoff", "steel deck sheets", "roof deck takeoff", "floor deck sheets", "metal decking quantity"); a
hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `metal-roof-panels` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the cover area, sheet count, side-lap run, and the error seams (non-positive area, cover width, sheet length; negative
waste). The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,325 -> 1,326.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(10000*1.05/((36/12)*30)) -> 117 sheets).

## 5. Roadmap position

Steel-erection takeoff beside `metal-roof-panels` and `metal-weight`, serving the steel erector / ironworker
(construction). Stays evidence-driven; the SDI and drawings set the fastening.
