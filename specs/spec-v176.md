# roughlogic.com Specification v176 -- Working-Space Clearance Reference (NEC 110.26) (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.79.0; part of catalog 628 -> 639). Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one reference tile returning the required working
> space in front of electrical equipment per NEC 110.26 -- the depth by voltage and condition, the 30
> in width, and the 6.5 ft headroom. Adds one tile to **`calc-electrical.js`** (Group A); no new
> module, group, or dependency. Inherits spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog has reference tiles for GFCI/AFCI requirements
> (`gfci-afci-reference`) and color codes (`color-codes`), but not the single most-cited installation
> dimension: the 110.26 working clearance that determines whether a panel can even go where it is
> drawn. Electricians and inspectors reach for the depth-by-condition table constantly, and it lives
> only in memory or a printed code book.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. This is
a reference-lookup tile (the `gfci-afci-reference` / `color-codes` pattern): inputs select rows, the
outputs are clearance dimensions in `L` (ft/in). The bundled Table 110.26(A)(1) depths (Condition 1/2/3
across the 0-150 V and 151-600 V nominal-to-ground bands), the 30 in (or equipment-width) clearance,
and the 6.5 ft headroom are annotated as the public NEC values. The v18/v21 contract: an unrecognized
voltage band or condition returns `{ error }`; there are no computations or divisions, only the table
read. Citation discipline (v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023 110.26(A) (working
space) and 110.26(E) (dedicated equipment space)`, `editionNote` `NEC_DISCLOSURE`, with the note that
Condition 1/2/3 describe what is across from the live parts, that the width is the greater of 30 in or
the equipment width, that the space must permit a 90-degree door swing, and that the AHJ governs.

## 2. The tile

### 2.1 `working-space-110-26` -- NEC 110.26 Working Clearance Lookup

```
inputs:
  nominal_v_to_ground   select   "0-150 V" or "151-600 V"
  condition             select   1 (exposed live / no grounded surface opposite)
                                 2 (grounded surface opposite, e.g. concrete/brick/tile)
                                 3 (exposed live parts on both sides)
  equipment_width_in    L        width of the equipment (for the width output)

depth_ft = Table 110.26(A)(1):
   0-150 V    -> Cond 1: 3.0   Cond 2: 3.0   Cond 3: 3.0
   151-600 V  -> Cond 1: 3.0   Cond 2: 3.5   Cond 3: 4.0
width_in  = max(30, equipment_width_in)
height_ft = 6.5            # or the height of the equipment, whichever is greater
```

**Pinned worked example.** A 480Y/277 V panel (more than 150 V to ground -> "151-600 V" band) on a
concrete wall with a grounded surface opposite (**Condition 2**), 24 in wide:
`depth = 3.5 ft`, `width = max(30, 24) = 30 in`, `height = 6.5 ft`. The panel needs 3.5 ft of clear
depth, 30 in of width, and 6.5 ft of headroom, with a 90-degree door swing. **Cross-check (low
voltage / wide gear).** A 208Y/120 V panel ("0-150 V" band) in **Condition 1**, 40 in wide:
`depth = 3.0 ft`, `width = max(30, 40) = 40 in`, `height = 6.5 ft`. Voltage and condition set the
depth; equipment width can override the 30 in minimum. The AHJ governs.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 110.26(A)/(E), the depth table and the
width/headroom/door-swing rules listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`working-space-110-26` -> `computeWorkingSpace11026` in `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `gfci-afci-reference` / `pull-box-sizing` / `service-load`);
`data/search/aliases.json` ("working space", "110.26", "working clearance", "panel clearance",
"dedicated space", "code clearance"); the id appended to the existing `ELECTRICAL_RENDERERS` declare
in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both lookups, the equipment-width override, and the unrecognized-selection error seam.
Raise the `calc-electrical.js` size cap by ~20 percent if needed (dated comment); bump the
`citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the width-override path); `npm run build` (one
new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
depth, width, and height lines wrap on a phone); render-no-nan + a11y sweep, output read to the value
(480 V / Cond 2 / 24 in -> 3.5 ft / 30 in / 6.5 ft; 208 V / Cond 1 / 40 in -> 3.0 ft / 40 in).

## 5. Roadmap position

Joins the reference family (`gfci-afci-reference`, `color-codes`) with the most-cited install
dimension, alongside v177 (burial depth) and v178 (support spacing). Further Group A growth stays
evidence-driven.
