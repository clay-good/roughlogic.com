# roughlogic.com Specification v904 -- Curb-and-Gutter Concrete Volume (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v903.md. Concrete flatwork sweep, beside `concrete`
> and `concrete-sawcut-footage`.
>
> **The gap, and the evidence for it.** `concrete` takes off shapes but nothing gives the **curb-and-gutter** pour, a
> linear run of a fixed cross-section. Grep confirmed no curb-gutter tile. The number this settles: a 2.0 ft^2 curb-and-
> gutter section over 300 LF is **24 cy** with waste -- **7.4 cy per 100 LF** -- the order for a flatwork crew running
> curb machine or hand-forming.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`concrete`, `concrete-sawcut-footage`): the cross-section carries `L^2`, the length `L`, the waste is
dimensionless, and both volumes are `L^3`. The v18/v21 contract: a non-finite or non-positive cross-section or length
returns `{ error }`; a negative waste returns `{ error }`. Citation discipline (v19/v22): the linear-pour identity by name
(volume = cross-section x length / 27 x (1 + waste); cy per 100 LF = cross-section x 100 / 27), `GOVERNANCE.general`; the
note states that the cross-sectional area comes from the DOT or municipal standard curb-and-gutter detail (the user
computes or measures it -- no copyrighted section reproduced), that the cy per 100 LF is the ordering rule of thumb, and
that this is a linear per-station pour distinct from the shape presets in `concrete`.

## 2. The tile

### 2.1 `curb-gutter-volume` -- Curb-and-Gutter Concrete Volume

```
inputs:
  cross_section_ft2 curb + gutter cross-sectional area (ft^2)
  length_ft         run length (ft)
  waste_pct         waste allowance (percent, default 8)

volume_cy    = cross_section_ft2 * length_ft / 27 * (1 + waste_pct/100)
cy_per_100lf = cross_section_ft2 * 100 / 27
```

**Pinned worked example.** Cross-section 2.0 ft^2, length 300 LF, 8% waste:
`volume = 2.0*300/27*1.08 = ` **24 cy**; `cy/100LF = 2.0*100/27 = ` **7.4 cy**. Cross-check: a heavier 2.5 ft^2 section
(deeper gutter, taller curb) is `2.5*300/27*1.08 = ` **30 cy** and **9.3 cy/100LF** -- the cross-section is the lever, the
length just scales it.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["concrete", "construction"]`, inside the `// Group E` construction block near
`concrete`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js`
entry (volume = cross-section x length / 27 x (1 + waste), `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the heavier-section cross-check); `test/fixtures/compute-map.js` (`curb-gutter-volume` ->
`computeCurbGutterVolume`, module `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `concrete` /
`concrete-sawcut-footage` / `material-quantity`); `data/search/aliases.json` (5 collision-checked aliases: "curb and
gutter volume", "curb concrete cy", "curb gutter pour", "concrete curb volume", "curb machine concrete"); a hand-written
renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `concrete` renderer (non-exported, so no DOM-sentinel dims
row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the volume and
cy-per-100LF and the error seams (non-positive cross-section or length; negative waste). The calc-construction.js gzip cap
is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent
from home first paint. Home tile count 1,352 -> 1,353.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(2.0*300/27*1.08 -> 24 cy).

## 5. Roadmap position

Concrete flatwork takeoff beside `concrete` and `concrete-sawcut-footage`, serving the flatwork / curb crew (concrete /
construction). Stays evidence-driven; the standard detail sets the cross-section.
