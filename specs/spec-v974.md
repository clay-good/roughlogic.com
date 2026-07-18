# roughlogic.com Specification v974 -- Fertigation / Chemigation Injection Rate (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L), no new module, group, or dependency. Inherits spec.md through spec-v973.md. Irrigation/application sweep, beside
> the accepted `tank-mix`, `sprayer-calibration`, and `anhydrous-ammonia-rate` tiles.
>
> **The gap, and the evidence for it.** The catalog calibrates a sprayer boom and a tank mix, but nothing sizes the
> INJECTION-PUMP rate for applying product through an irrigation system. Grep confirmed no fertigation / chemigation
> tile (the `injector-*` hits are engine fuel injectors). The number this settles: 5 gal/acre over 40 acres in a 6-hour
> set is a **33.3 gph** injection rate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, mixing gal/acre, acres, and hours), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive rate /
acres / set time returns `{ error }`. Citation discipline (v19/v22): the injection-rate practice by name (EPA
chemigation rules; FIFRA label), `GOVERNANCE.general`; the note states that the injection starts after the system is
pressurized and ends with a clear-water flush, that a stock solution's concentration is the injection/system flow ratio
times the stock strength, and -- critically -- that an EPA-required anti-siphon/check-valve/interlock package must
protect the water source; the FIFRA label, state chemigation rules, and a drawdown calibration govern.

## 2. The tile

### 2.1 `fertigation-injection-rate` -- Fertigation / Chemigation Injection Rate

```
inputs:
  product_rate_gal_per_acre product rate (gal/acre), default 5
  area_acres                field area (acres), default 40
  set_time_hours            irrigation set duration (hours), default 6

total_product_gal    = product_rate_gal_per_acre x area_acres
injection_rate_gph   = total_product_gal / set_time_hours
injection_rate_gpm   = injection_rate_gph / 60
```

**Pinned worked example.** 5 gal/acre over 40 acres in a 6-hour set: total = `5 x 40 = ` **200 gal**, injection rate =
`200/6 = ` **33.33 gph** (0.556 gpm). Cross-check: a longer **12-hour** set feeds the same 200 gallons at half the rate,
`200/12 = ` **16.67 gph**.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `mad-irrigation-trigger`); a `tile-meta.js` `_TILES`
entry (`L`); a `citations.js` entry (fertigation/chemigation / EPA / FIFRA, `GOVERNANCE.general`); `test/fixtures/worked-
examples.json` (the 6-hour example plus the longer-set cross-check, pinning the total and injection rate); `test/
fixtures/compute-map.js` (`fertigation-injection-rate` -> `computeFertigationInjectionRate`, module `../../calc-
agriculture.js`); `scripts/related-tiles.mjs` (-> `tank-mix` / `sprayer-calibration` / `irrigation-requirement`);
`data/search/aliases.json` (5 collision-checked aliases: "fertigation", "chemigation", "injection rate", "fertilizer
injection", "fertigation pump"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`AGRICULTURE_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-agriculture declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-
strings; a `bounds-fuzzer.test.js` block pinning the total and injection rate, the longer-set and rate/acre linearity
directions, and the error seams. The calc-agriculture.js gzip cap and the Group L group shell are watched at build (cap
raised for this sweep). Home tile count 1,422 -> 1,423.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(5 gal/acre / 40 acres / 6 hr -> 200 gal, 33.3 gph).

## 5. Roadmap position

Irrigation/application beside `tank-mix`, serving the irrigator / applicator (agriculture). Deliberately the
injection-rate arithmetic; the backflow-prevention (anti-siphon/check-valve/interlock) package, the FIFRA product label,
the state chemigation regulations, and the applicator's drawdown calibration govern the actual application. Stays
evidence-driven. Continues the irrigation/application sweep at 1 new spec (v974).
