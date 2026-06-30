# roughlogic.com Specification v217 -- Ridge / Hip Cap and Roofing-Nail Takeoff (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.86.0; was PROPOSED 2026-06-30). Batch spec-v215..v217 (roofing material takeoff -- the install-side gaps the
> catalog's shingle-only `roofing-squares` left: the eave ice barrier, the metal-panel alternative, and the
> ridge-cap-and-fastener accessories). This closes the v215..v217 roofing batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: cap shingles and fastening are set by
> roofers. Adds one tile to **`calc-construction.js`** (Group E); no new module, group, or dependency.
> Inherits spec.md through spec-v216.md.
>
> **The gap, and the evidence for it.** `roofing-squares` orders the field shingles, the underlayment, the drip
> edge, and the starter strip -- but it stops at the field. The two accessories that finish every shingle order
> and that it does not touch are the hip-and-ridge cap (bought by the linear foot of ridge and hip, not by the
> square) and the roofing nails. The nail count is not a footnote: IRC R905.2.6 and the manufacturer's
> instructions step the pattern from four nails per shingle to six in the high-wind zone, which moves the order
> by half again, and a roofer orders nails by the pound, not the each. The catalog can square a roof but cannot
> finish the cap or count the box of nails the field actually consumes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The ridge and
hip lengths, the cap coverage per bundle, and the cap exposure are a length (`L`, ft or in); the squares, the
shingles per square, the nails per shingle, the cap bundles, the nail count, the nails per pound, and the
nail pounds are `dimensionless`. The v18/v21 contract: any non-finite input, a negative ridge or hip length,
a non-positive cap coverage / cap exposure / shingles-per-square / nails-per-pound, a nails-per-shingle
outside 2-8, or a total cap length of zero with field squares also zero (nothing to order) returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the cap-bundle and nail relations by
name; `editionNote` names **IRC R905.2.6** (the asphalt-shingle fastening pattern, four nails standard and six
in the high-wind / steep-slope rows) and the **shingle manufacturer's application instructions**, and states
that **the nails-per-shingle and the cap coverage per bundle come from the product's wrapper and the adopted
wind zone (a pre-formed hip-and-ridge product covers far less per bundle than field-cut three-tab caps), the
shingles-per-square is the product's count, and this is a material takeoff, not a fastening approval** -- an
ordering aid, not the AHJ's nailing schedule.

## 2. The tile

### 2.1 `ridge-cap-fasteners` -- Hip / Ridge Cap Bundles and Roofing Nails by the Pound

```
inputs:
  ridge_lf          L              total ridge length, ft
  hip_lf            L              total hip length, ft
  cap_lf_per_bundle L              cap coverage per bundle, lf (pre-formed hip/ridge ~20; field-cut 3-tab ~35)
  cap_exposure_in   L              cap shingle exposure, in (default 5)
  squares           dimensionless  field shingle squares (from roofing-squares)
  shingles_per_sq   dimensionless  field shingles per square (default 64, architectural laminate)
  nails_per_shingle dimensionless  field nails per shingle (4 standard; 6 high-wind / steep), default 4
  nails_per_lb      dimensionless  roofing nails per pound (default 150, 1-1/4 in coil)

cap_len_lf  = ridge_lf + hip_lf
cap_bundles = ceil(cap_len_lf / cap_lf_per_bundle)
field_nails = squares * shingles_per_sq * nails_per_shingle
cap_pieces  = ceil(cap_len_lf * 12 / cap_exposure_in)
cap_nails   = cap_pieces * 2                            # two nails per cap piece
total_nails = field_nails + cap_nails
nail_lbs    = ceil(total_nails / nails_per_lb)
```

**Pinned worked example (24-square roof, 40 ft ridge, 4-nail).** A 2,400 ft^2 = 24-square architectural roof,
40 ft of ridge, no hips, 20 lf per cap bundle, 5 in exposure, 64 shingles per square, four nails each, 150
nails per pound: `cap_len = 40 + 0 = 40 lf`; `cap_bundles = ceil(40 / 20) = 2`;
`field_nails = 24 * 64 * 4 = 6,144`; `cap_pieces = ceil(40 * 12 / 5) = ceil(96) = 96`;
`cap_nails = 96 * 2 = 192`; `total_nails = 6,144 + 192 = 6,336`;
`nail_lbs = ceil(6,336 / 150) = ceil(42.2) = ` **43 lb of nails**, plus **2 cap bundles**.
**Cross-check (high-wind 6-nail, 30 ft ridge + 60 ft hip).** Same 24-square roof, but 30 ft ridge and 60 ft
hip and the six-nail high-wind pattern: `cap_len = 30 + 60 = 90 lf`; `cap_bundles = ceil(90 / 20) = 5`;
`field_nails = 24 * 64 * 6 = 9,216`; `cap_pieces = ceil(90 * 12 / 5) = 216`; `cap_nails = 216 * 2 = 432`;
`total_nails = 9,216 + 432 = 9,648`; `nail_lbs = ceil(9,648 / 150) = ceil(64.3) = ` **65 lb**, plus **5 cap
bundles**. The six-nail pattern alone drives the field nails from 6,144 to 9,216, and the hips add three cap
bundles -- the same field area, but the wind zone and the cut-up roof move the accessory order by half again.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["roofing","carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the cap-bundle and nail relations, `editionNote` naming IRC
R905.2.6 and the manufacturer instructions and the wind-zone / pre-formed-vs-field-cut / takeoff-not-approval
caveats); `test/fixtures/worked-examples.json` (the 4-nail example + the high-wind hip cross-check);
`test/fixtures/compute-map.js` (`ridge-cap-fasteners` -> `computeRidgeCapFasteners` in
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `roofing-squares` / `hip-valley-rafter` /
`ice-barrier-coverage`); `data/search/aliases.json` ("ridge cap", "hip and ridge", "cap shingles", "roofing
nails", "nails per square", "high wind nailing", "six nail pattern"); the id appended to the existing
construction renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, negative ridge / hip,
cap coverage / exposure / shingles-per-square / nails-per-pound <= 0, nails-per-shingle out of 2-8, everything
zero). Raise the `calc-construction.js` size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block, the no-hip path); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the cap-bundles / field-nails /
cap-nails / pounds stack wraps on a phone); render-no-nan + a11y sweep, output read to the value
(24 squares / 40 ft ridge / 4-nail -> 2 cap bundles, 43 lb).

## 5. Roadmap position

Closes the v215..v217 roofing material-takeoff batch (eave ice barrier, metal panels, ridge cap and nails).
Pairs with `roofing-squares` as the accessory order the field takeoff leaves open, and with `hip-valley-rafter`
which gives the hip and ridge lengths this tile consumes. A starter-and-cap colour-match waste sub-mode is a
deliberate future follow-on.
