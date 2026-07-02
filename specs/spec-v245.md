# roughlogic.com Specification v245 -- Formwork Shore Post Load and Spacing (ACI 347) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.90.0; was PROPOSED 2026-07-01). Batch spec-v245..v247 (the cast-in-place placing-and-curing trio -- the three things a
> concrete super manages between the takeoff and the finished slab: the shores that hold the fresh pour up, the
> evaporation that cracks its surface, and the strength gain that says when the forms and shores can come off). This spec
> opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: sizing and spacing the shores under an elevated
> slab or beam form is the formwork carpenter's load calculation, and getting it wrong is a classic construction
> collapse. Adds one tile to **`calc-construction.js`** (Group E, beside `formwork-pressure`); no new module, group, or
> dependency. Inherits spec.md through spec-v244.md.
>
> **The gap, and the evidence for it.** The catalog computes the lateral pressure a wall form must resist
> (`formwork-pressure`) but has nothing for the vertical load path of an elevated pour: the weight of the fresh concrete,
> the formwork itself, and the construction live load, all carried down through the shore posts to whatever is below.
> ACI 347 sets that load -- a construction live load of at least 50 psf, and a combined dead-plus-live design load of not
> less than 100 psf (125 psf where motorized buggies run) -- and the load on any one shore is that pressure times the
> post's tributary area. An 8 in slab already puts 100 psf of dead concrete on the deck before a single worker steps on
> it, so a 4 ft shore grid carries over 2,500 lb per post. Shore failures during placement are among the most common
> serious formwork accidents, which is exactly why the per-post load and the spacing that keeps it under the shore's
> rated capacity deserve their own calculation.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The slab thickness is a
length (in); the concrete unit weight, the form dead load, the construction live load, and the combined design pressure
are pressures (psf); the post spacings and the tributary area are a length (ft) and an area (ft^2); the load per shore
and the shore's rated capacity are forces (lb); the utilization is `dimensionless`. The v18/v21 contract: any non-finite
input, a non-positive slab thickness / unit weight / post spacing, or a rated capacity at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the shore-load relations by name; `editionNote`
names **ACI 347 (Guide to Formwork for Concrete)** (design pressure `= max(slab_in/12 x unit_weight + form_load + live_load,
100 psf minimum)`, load per shore `= design pressure x spacing_x x spacing_y`), gives the bundled defaults as editable
(concrete unit weight 150 pcf, form dead load 10 psf, construction live load 50 psf, combined-load floor 100 psf), and
states that **the construction live load rises to 75 psf and the floor to 125 psf where motorized carts or buggies run,
the shore's rated capacity is the manufacturer's allowable for its extended height and bracing condition (a taller or
unbraced post rates far lower), reshoring and multi-level shore-load distribution to the slabs below (ACI 347.2R) are a
separate analysis, the slab below must itself be strong enough to take the shore reaction, and this is a design aid, not
a stamped shoring plan** -- a qualified engineer and the shoring manufacturer govern.

## 2. The tile

### 2.1 `shore-post-load` -- Formwork Shore Post Load and Spacing

```
inputs:
  slab_in         in          slab (or equivalent) thickness of the fresh pour, in
  unit_weight     pcf         fresh concrete unit weight, pcf (default 150)
  form_load       psf         formwork dead load, psf (default 10)
  live_load       psf         construction live load, psf (default 50; 75 with buggies)
  spacing_x       ft          shore spacing one way, ft
  spacing_y       ft          shore spacing the other way, ft
  shore_capacity  lb          rated allowable capacity per shore, lb

slab_load    = slab_in / 12 * unit_weight
design_psf   = max(slab_load + form_load + live_load, 100)
trib_area    = spacing_x * spacing_y
shore_load   = design_psf * trib_area
utilization  = shore_load / shore_capacity
```

**Pinned worked example (8 in slab on a 4 ft shore grid).** An 8 in normal-weight slab, 150 pcf, 10 psf form load, 50 psf
live load, shores on a 4 ft by 4 ft grid, each rated 6,000 lb: `slab_load = 8/12 x 150 = 100 psf`;
`design_psf = max(100 + 10 + 50, 100) = 160 psf`; `trib_area = 4 x 4 = 16 ft^2`; `shore_load = 160 x 16 = ` **2,560 lb per
shore**; `utilization = 2,560 / 6,000 = 0.43` -- the grid is comfortable. **Cross-check (motorized buggies on the deck).**
The same slab with the buggy live load of 75 psf and the 125 psf combined floor: `design_psf = max(100 + 10 + 75, 125) =
185 psf`; `shore_load = 185 x 16 = ` **2,960 lb per shore** (utilization 0.49). Raising the live load for the buggies adds
400 lb to every post, which on a marginal grid is the difference between a shore inside its rating and one over it -- the
reason the placing method, not just the slab thickness, sets the shore load.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["concrete","carpentry","construction"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the shore-load relations, `editionNote` naming ACI 347 with the bundled
loads and the buggy / rated-capacity / reshoring / slab-below caveats); `test/fixtures/worked-examples.json` (the 4 ft
grid example + the buggy cross-check); `test/fixtures/compute-map.js` (`shore-post-load` -> `computeShorePostLoad` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `formwork-pressure` / `concrete-strength-gain` /
`footing-area`); `data/search/aliases.json` ("shore load", "shoring", "shore spacing", "formwork shore", "post shore",
"reshore", "deck shoring", "elevated slab shoring"); the id appended to the existing construction renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples and error seams (non-finite, slab / unit weight / spacing <= 0, capacity <= 0). Raise the `calc-construction.js`
size cap if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the non-positive-input error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the slab-load / design-psf / shore-load /
utilization stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (8 in slab / 4 ft grid ->
2,560 lb per shore, 0.43 utilization).

## 5. Roadmap position

Opens the cast-in-place placing-and-curing batch (v245..v247). Sits beside `formwork-pressure` (the lateral load a wall
form takes) as the vertical-load companion, and feeds `concrete-strength-gain` (v247), which says when the fresh slab has
cured enough to strip the forms and pull these shores. The evaporation the fresh surface faces between the two is priced
by `concrete-evaporation-rate` (v246). Multi-level reshore-load distribution (ACI 347.2R) and a shore buckling / extended
-height derate are deliberate future follow-ons.
