# roughlogic.com Specification v538 -- Sanitizer Dilution, 3-Compartment Sink (calc-kitchen.js, Group O, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-kitchen.js`**
> (Group O, kitchen and food service); no new module, group, or dependency. Inherits spec.md through spec-v537.md.
>
> **The gap, and the evidence for it.** The sanitizing sink is the last line of defense against foodborne illness, and
> the bench has restoration and pool sanitizer tiles but nothing for the food-contact concentrations the FDA Food Code
> requires: chlorine 50 to 100 ppm, quaternary ammonium per label (about 200 ppm), iodine 12.5 to 25 ppm. Mixing to a
> target ppm from a concentrate of known active percent is simple arithmetic, but the catches are chemistry. Chlorine's
> required concentration **rises** as the water gets colder or more alkaline -- the Food Code steps the ppm up by
> temperature and pH -- so a fixed ounce-per-gallon recipe can under-sanitize on a cold morning. Quats are inactivated
> by hot or hard water. And test strips, not arithmetic, are the legal confirmation, with the EPA-registered product
> label as the authority. The tile takes the sanitizer type, the concentrate active percent, the target ppm, and the
> batch volume, and returns the ounces of concentrate to add, flags the target against the Food Code range, and states
> the minimum contact time.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The batch volume is a
volume (`L^3`, in gallons); the ounces of concentrate is a volume (`L^3`, in fl oz); the active percent, the target ppm,
and the `128` and `10000` constants are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive
active percent, target ppm, or batch volume, or an unrecognized sanitizer type returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the dilution relation by name (FDA Food Code Sec. 4-501.114); `editionNote` names
the **3-compartment sink sanitizer dilution (FDA Food Code)**, prints
`oz_per_gal = 128 x target_ppm / (active_pct x 10000)` and `total_oz = oz_per_gal x gallons`, lists the Food Code ranges
(**chlorine 50-100 ppm, quat ~200 ppm per label, iodine 12.5-25 ppm**), and states that **chlorine's required
concentration rises as water gets colder or more alkaline (the Food Code table steps ppm up by temperature and pH so a
fixed dose can under-sanitize), quats are inactivated by hot or hard water, the concentration must be confirmed with
test strips and the minimum contact time observed, and the EPA-registered product label is the legal authority** -- a
mixing aid, not a substitute for test strips and the label.

## 2. The tile

### 2.1 `kitchen-sanitizer-ppm` -- Ounces per Batch to Hit a Food-Code ppm (and Why Cold Water Needs More)

```
inputs:
  sanitizer_type   -    chlorine / quat / iodine
  active_pct       %    concentrate active ingredient percent (e.g. 5.25 for bleach)
  target_ppm       ppm  desired sanitizer concentration
  batch_gallons    gal  sink compartment volume

oz_per_gal = 128 x target_ppm / (active_pct x 10000)          [fl oz / gal]
total_oz   = oz_per_gal x batch_gallons                       [fl oz]
in_range   = target_ppm within the Food Code band for the type
```

**Pinned worked example (chlorine bleach at 5.25% active, target 100 ppm, a 3-gallon compartment).**
`oz_per_gal = 128 x 100 / (5.25 x 10000) = 12,800 / 52,500 = ` **0.24 fl oz/gal**, so the batch needs
`0.24 x 3 = ` **0.73 fl oz** of bleach, and 100 ppm sits at the top of the Food Code's 50-100 ppm chlorine band (in
range). On cold or alkaline water the Food Code would push the target higher, so the same 0.73 oz could fall short --
the reason test strips are mandatory. **Cross-check (a quat at 200 ppm from a 10% concentrate).**
`oz_per_gal = 128 x 200 / (10 x 10000) = 25,600 / 100,000 = ` **0.26 fl oz/gal**, `0.77 fl oz` for the 3-gallon sink --
a similar dose but a different chemistry (and one that hot or hard water would weaken). The tile returns the ounces per
gallon, the total ounces, and the in-range flag.

## 3. Wiring

A `tools-data.js` row (group `O`, trades `["kitchen", "food-service"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the chlorine
example + the quat cross-check); `test/fixtures/compute-map.js` (`kitchen-sanitizer-ppm` -> `computeKitchenSanitizerPpm`
in `../../calc-kitchen.js`); `scripts/related-tiles.mjs` (-> `antimicrobial-dilution` / `pool-chlorine-dose` /
`food-cost-percentage`); `data/search/aliases.json` ("sanitizer dilution", "3 compartment sink", "food code sanitizer",
"chlorine ppm sink", "quat sanitizer", "bleach dilution food", "sanitizer concentration", "4-501.114"); the id appended
to the kitchen renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the oz-per-gallon relation, the Food Code range flag by type, and
the error seams (non-finite, non-positive active / ppm / gallons, bad type). Hand-writes its renderer (mirroring the
calc-kitchen.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the oz-per-gal / total / range stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the chlorine example -> 0.24 oz/gal, 0.73 oz).

## 5. Roadmap position

Adds the food-contact sanitizer dilution the kitchen bench lacked (distinct from the restoration `antimicrobial-dilution`
and the `pool-chlorine-dose`). A temperature/pH chlorine-adjustment table (stepping the target per the Food Code) and a
contact-time-by-type reference are deliberate future follow-ons. Further Group O growth stays evidence-driven.
