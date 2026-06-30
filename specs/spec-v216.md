# roughlogic.com Specification v216 -- Metal Roof Panel and Fastener Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED 2026-06-30. Batch spec-v215..v217 (roofing material takeoff -- the install-side gaps the
> catalog's shingle-only `roofing-squares` left: the eave ice barrier, the metal-panel alternative, and the
> ridge-cap-and-fastener accessories).**
> In-scope catalog expansion under the spec-v106 trades-only charter: metal roofing is installed by roofers.
> Adds one tile to **`calc-construction.js`** (Group E); no new module, group, or dependency. Inherits spec.md
> through spec-v215.md.
>
> **The gap, and the evidence for it.** `roofing-squares` is built around the shingle bundle -- squares,
> bundles, underlayment, drip edge -- and there is nothing in the catalog for the other half of the
> residential and ag-building re-roof market: metal panel. Metal does not order by the square; it orders by the
> panel, and the panel count turns entirely on the product's net coverage width, not the cover width on the
> box. A 36 in exposed-fastener panel and a 16 in standing-seam panel covering the same plane differ by nearly
> a factor of two in panel count and in linear feet, and the through-fastener count (screws per square, or
> clips for standing seam) is the second order a metal job lives or dies on. The catalog can take off a shingle
> roof but cannot count panels and screws for a metal one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The eave width,
the panel length, and the panel net coverage width are a length (`L`, ft or in); the plane area is `L^2`
(ft^2); the panels, the squares, and the fasteners are `dimensionless`. The v18/v21 contract: any non-finite
input, a non-positive eave width / panel length / panel net width, or a non-positive fasteners-per-square
returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the panel-count and fastener
relations by name; `editionNote` names the **Metal Construction Association (MCA)** and **Metal Roofing
Alliance (MRA)** installation references and the **manufacturer panel-coverage and fastening charts**, and
states that **the net coverage width is the product's published value (not the overall sheet width), the
fastener density is the manufacturer's pattern for the wind zone (a standing-seam system substitutes concealed
clips for exposed screws), the panel length is the finished eave-to-ridge length on the slope including the
overhang, and the result is per roof plane (double it for a symmetric gable)** -- a material takeoff, not a
fastening or wind-uplift design.

## 2. The tile

### 2.1 `metal-roof-panels` -- Panels, Linear Feet, and Fasteners for One Roof Plane

```
inputs:
  eave_width_ft      L     horizontal width along the eave for one roof plane, ft
  panel_length_ft    L     finished panel length eave-to-ridge on the slope incl. overhang, ft
  panel_net_in       L     panel net coverage width, in (exposed-fastener ~36; standing seam ~16-18)
  fasteners_per_sq   dimensionless  through-fasteners (or clips) per square, per the wind-zone pattern (default 80)

panels        = ceil(eave_width_ft * 12 / panel_net_in)
total_panel_lf = panels * panel_length_ft
plane_area_ft2 = eave_width_ft * panel_length_ft        # panel_length is on the slope, so this is slope area
squares        = plane_area_ft2 / 100
fasteners      = ceil(squares * fasteners_per_sq)
```

**Pinned worked example (exposed-fastener ag panel).** A roof plane 40 ft wide at the eave, 18 ft panel length
on the slope, 36 in net coverage, 80 screws per square: `panels = ceil(40 * 12 / 36) = ceil(13.33) = 14`;
`total_panel_lf = 14 * 18 = 252 ft`; `plane_area = 40 * 18 = 720 ft^2 = 7.2 squares`;
`fasteners = ceil(7.2 * 80) = ceil(576) = ` **576 screws** -- for **14 panels** / 252 lf on this plane (double
for the far slope of a gable).
**Cross-check (standing seam, 16 in net -- the panel count nearly doubles).** Same 40 ft x 18 ft plane, but a
16 in net-coverage standing-seam panel: `panels = ceil(40 * 12 / 16) = ceil(30) = 30`;
`total_panel_lf = 30 * 18 = 540 ft`. The plane area and squares are identical, but the narrow seam spacing
more than doubles the panel count and the linear feet -- which is why net coverage width, not sheet width or
square footage, is the number that sets a metal order (and why standing seam substitutes concealed clips for
the exposed-screw count).

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["roofing","carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the panel-count and fastener relations, `editionNote` naming the
MCA / MRA references and the manufacturer charts and the net-coverage / per-plane / clip-vs-screw caveats);
`test/fixtures/worked-examples.json` (the exposed-fastener example + the standing-seam cross-check);
`test/fixtures/compute-map.js` (`metal-roof-panels` -> `computeMetalRoofPanels` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `roofing-squares` / `roof-pitch` /
`hip-valley-rafter`); `data/search/aliases.json` ("metal roof", "metal panels", "standing seam", "exposed
fastener", "ag panel", "r panel", "panel count", "roofing screws"); the id appended to the existing
construction renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, width / length / net width
<= 0, fasteners-per-square <= 0). Raise the `calc-construction.js` size cap by ~20 percent if needed (dated
comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the panels / linear-feet / squares / fasteners
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value
(40 ft / 18 ft / 36 in -> 14 panels, 576 screws).

## 5. Roadmap position

The metal alternative to the shingle field in the v215..v217 roofing batch. Pairs with `roofing-squares`
(shingle field) and `ice-barrier-coverage` (v215, eave membrane). `ridge-cap-fasteners` (v217) is the cap and
nail accessory tile that closes the batch. A panel-trim and ridge / hip / gable flashing linear-foot sub-mode
is a deliberate future follow-on.
