# roughlogic.com Specification v486 -- Trailer Tongue Weight and Sway Check (calc-trucking.js, Group J, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J); no new module, group, or dependency. Inherits spec.md through spec-v485.md.
>
> **The gap, and the evidence for it.** The trucking bench checks the gross combination weight (`gcwr-check`), the axle
> distribution (`axle-load-distribution`), and the tire load (`tire-load-check`), but nothing for the single number that
> decides whether a trailer tows straight or fishtails into a wreck: the tongue weight. Every towing authority (NHTSA,
> the SAE J2807 tow-rating standard, every hitch and vehicle manufacturer) puts the loaded trailer's down-force at the
> coupler in a band -- **10 to 15% of the trailer's gross weight for a conventional (bumper-pull) hitch**, and **15 to
> 25% for a gooseneck or fifth wheel**. The arithmetic is trivial (`tongue% = tongue_weight / trailer_weight x 100`) but
> the catch the tile exists to flag is not: too little tongue weight (load too far behind the axle) is the classic cause
> of trailer sway, and too much overloads the hitch and the tow vehicle's rear axle while it unloads the steer axle and
> robs steering and braking. The catalog sizes the combined weight but never checks where that weight sits on the ball,
> the first thing an inspector or a careful hauler measures before pulling out.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The weights are masses
(`M`, the module's `weight_lb` convention); the percent is `dimensionless`; the hitch type is `dimensionless`. The
v18/v21 contract: any non-finite input, a non-positive trailer or tongue weight, a tongue weight at or above the trailer
gross (the tongue is a fraction of the load, not the whole), or a negative hitch rating returns `{ error }`. Citation
discipline (v19/v22): `GOVERNANCE.general` over the tongue-weight bands by name; `editionNote` names the **standard
towing tongue-weight guidance (NHTSA / SAE J2807; the hitch and vehicle manufacturer ratings)**, prints
`tongue% = tongue_weight / trailer_gross x 100` with the **10-15% conventional and 15-25% gooseneck/fifth-wheel target
bands**, and states that **the bands are the industry rules of thumb (the specific vehicle, hitch, and trailer
manufacturer ratings and the tow-vehicle's payload and rear-axle GAWR govern the actual limits), a low tongue weight is
the classic trailer-sway cause while a high one overloads the hitch and unloads the steer axle, and the tongue weight
must be an actual scale reading (not a guess) taken with the trailer level and loaded as it will tow** -- a setup screen,
not a substitute for a scale and the manufacturer's ratings.

## 2. The tile

### 2.1 `trailer-tongue-weight` -- The Tongue Weight a Trailer Should Carry

```
inputs:
  trailer_gross_weight_lb  lb              the loaded trailer's gross weight
  tongue_weight_lb         lb              the measured down-force at the coupler (a scale reading)
  hitch_type               conventional |  sets the target band (conventional 10-15%, gooseneck/5th-wheel 15-25%)
                           gooseneck
  hitch_rating_lb          lb              the hitch / receiver tongue-weight rating (0 to skip the check)

tongue_pct    = tongue_weight_lb / trailer_gross_weight_lb x 100                 [%]
target_low_lb = trailer_gross_weight_lb x low_pct / 100                          [lb]
target_high_lb= trailer_gross_weight_lb x high_pct / 100                         [lb]
in_band       = low_pct <= tongue_pct <= high_pct
over_rating   = hitch_rating_lb > 0 and tongue_weight_lb > hitch_rating_lb
```

**Pinned worked example (a 7,000 lb conventional trailer).** A bumper-pull trailer grossing 7,000 lb with a measured
700 lb tongue weight: `tongue% = 700 / 7000 x 100 = ` **10.0%**, right at the bottom of the **10-15% band** (the target
window is 700 to 1,050 lb), so it tows in the safe range. **Cross-check (the sway trap).** Shift the load rearward until
the coupler reads only 490 lb: `tongue% = 490 / 7000 x 100 = ` **7.0%**, below the 10% floor -- the tile flags the
**trailer-sway risk** and the fix (move cargo forward of the trailer axle to put more weight on the ball), the
miscalculation behind a large share of fishtailing single-vehicle trailer wrecks. The tile returns the percent, the
target weight window, the in-band verdict, and the over-rating flag.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 10% in-band example + the 7%
sway cross-check); `test/fixtures/compute-map.js` (`trailer-tongue-weight` -> `computeTrailerTongueWeight` in
`../../calc-trucking.js`); `scripts/related-tiles.mjs` (-> `axle-load-distribution` / `gcwr-check` / `tire-load-check`);
`data/search/aliases.json` ("tongue weight", "trailer sway", "hitch weight", "tongue percentage", "gooseneck weight",
"fifth wheel weight", "trailer balance", "sway control"); the id appended to the trucking renderers declare in `app.js`;
the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the band boundaries, the gooseneck band, the over-rating flag, and the error seams (non-finite, non-positive weights,
tongue >= trailer, negative rating). Registered via the module's `_simpleRenderer` factory (a select + three number
fields). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the percent / target-window / verdict stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the 7,000 lb example -> 10.0% tongue weight).

## 5. Roadmap position

Adds the where-the-weight-sits check beside the how-much-weight checks: `gcwr-check` (combined weight),
`axle-load-distribution` (per-axle), and `tire-load-check` (per-tire) now have the tongue-weight balance that decides
whether the rig tows straight. A weight-distributing-hitch (WDH) load-return companion, a payload / rear-GAWR
cross-check on the tow vehicle, and a cargo-position solver (where to place a load to hit a target tongue percent) are
deliberate future follow-ons. Further Group J growth stays evidence-driven.
