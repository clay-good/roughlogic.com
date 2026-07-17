# roughlogic.com Specification v816 -- Shotcrete / Gunite Order Quantity with Rebound (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,265 -> 1,266 tiles), via the
> `_simpleRenderer` factory in calc-construction.js. Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v815.md. Concrete-placement sweep, beside the
> `concrete` and `aggregate` takeoff tiles.
>
> **The gap, and the evidence for it.** The catalog takes off cast concrete (`concrete`) but nothing handles **shotcrete /
> gunite**, where a large fraction of the mix bounces off the work (rebound) and never stays in place, so the order has to
> be grossed up. Grep confirmed no shotcrete / gunite / rebound tile. The number this settles: a 500 sf face at 4 in holds
> **6.17 cy** in place, but at 20% rebound the crew must shoot **7.72 cy** -- and a 30% dry-mix overhead job pushes it to
> **8.82 cy**. The rebound is the difference between what you order and what stays on the wall.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
construction siblings (`concrete`, `aggregate`): the area carries `L^2`, the thickness `L`, the rebound percent is
dimensionless, and every volume is `L^3`. The v18/v21 contract: a non-finite or non-positive area or thickness returns
`{ error }`; a rebound percent outside 0-100 (or equal to 100, which would divide by zero) returns `{ error }`. Citation
discipline (v19/v22): the rebound gross-up identity by name (shot volume = in-place volume / (1 - rebound fraction), where
rebound = shot minus in-place over shot), `GOVERNANCE.general`; the note states that rebound depends on process and
orientation -- roughly 5-15% for wet-mix vertical work and 15-30% for dry-mix (gunite) overhead -- that the value comes
from the applicator's field record or the spec, and that rebound must be cleaned out and never worked back into the section.

## 2. The tile

### 2.1 `shotcrete-rebound-quantity` -- Shotcrete / Gunite Order Quantity with Rebound

```
inputs:
  area_sf        area to shoot (ft^2)
  thickness_in   in-place section thickness (in)
  rebound_pct    rebound loss (percent of material shot, default 20)

in_place_cy = area_sf * (thickness_in/12) / 27
shot_cy     = in_place_cy / (1 - rebound_pct/100)
rebound_cy  = shot_cy - in_place_cy
```

**Pinned worked example.** Area 500 sf, thickness 4 in, rebound 20%:
`in place = 500 * (4/12) / 27 = ` **6.173 cy**; `shot = 6.173 / (1 - 0.20) = ` **7.716 cy**;
`rebound = 7.716 - 6.173 = ` **1.543 cy**. Cross-check: a dry-mix overhead face at 30% rebound needs
`6.173 / 0.70 = ` **8.819 cy** shot -- the same section, but a third of the mix is lost, so the order climbs.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "concrete"]`, inside the `// Group E` construction block beside
`concrete`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js`
entry (shot = in-place / (1 - rebound), `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the pinned example
plus the dry-mix cross-check); `test/fixtures/compute-map.js` (`shotcrete-rebound-quantity` ->
`computeShotcreteReboundQuantity`, module `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `concrete` /
`aggregate` / `ready-mix-concrete-order`); `data/search/aliases.json` (5 collision-checked aliases: "shotcrete quantity",
"gunite order volume", "shotcrete rebound", "sprayed concrete order", "gunite waste factor"); a hand-written renderer in
the `CONSTRUCTION_RENDERERS` map mirroring the `concrete` renderer (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the in-place volume, the shot volume,
the rebound volume, and the error seams (non-positive area or thickness; rebound percent out of 0-100 and the 100 divide-
by-zero seam). The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and
`check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,264 -> 1,265.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(500 * (4/12) / 27 / 0.80 -> 7.716 cy).

## 5. Roadmap position

Adds the shotcrete / gunite order beside the cast-concrete `concrete` takeoff, serving the shotcrete applicator and pool /
slope / repair contractor (construction / concrete). Next concrete-placement candidate: annular grout volume for a cased
bore or pipe-in-casing. Stays evidence-driven; the applicator's field rebound governs.
