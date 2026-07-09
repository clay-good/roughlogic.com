# roughlogic.com Specification v508 -- Diesel Exhaust Fluid (DEF) Consumption and Range (calc-trucking.js, Group J, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-trucking.js`**
> (Group J, trucking and logistics); no new module, group, or dependency. Inherits spec.md through spec-v507.md.
>
> **The gap, and the evidence for it.** Every post-2010 diesel truck meters diesel exhaust fluid into the SCR
> aftertreatment to cut NOx, and the bench has no tile that plans it. The number drivers misjudge is the ratio: DEF
> burns at only about 2 to 3% of the diesel consumed, so a DEF tank does not empty on the same schedule as the fuel
> tank -- it spans several diesel fills. Plan DEF per fuel stop and you either haul jugs you do not need or, worse, run
> it dry. Running DEF empty is the roadside surprise the tile exists to prevent: the ECU derates the engine to a 5 mph
> limp-home, non-negotiable, until DEF is added. The tile takes the diesel consumed (or the trip miles and fuel economy),
> the DEF dose rate, and the DEF tank size, and returns the DEF used, the diesel a full DEF tank covers, and the driving
> range on a DEF fill -- so the DEF fill lands on the right fuel stop, not on the shoulder. It also flags the 12 F point
> below which DEF freezes.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The diesel and DEF volumes
are volumes (`L^3`, worked in gallons); the trip distance and range are lengths (`L`, in miles); the fuel economy is
`L^-2` (miles per gallon carries `L / L^3`); the dose-rate percent is `dimensionless`. The v18/v21 contract: any non-
finite input, a non-positive DEF dose rate, a non-positive DEF tank size, or a non-positive diesel volume (when the
diesel path is used) or non-positive miles / mpg (when the trip path is used) returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the DEF-consumption relations by name (SCR aftertreatment; ISO 22241 DEF spec);
`editionNote` names the **DEF consumption and range model**, prints `def_used = diesel x dose / 100`,
`diesel_per_def_tank = def_tank / (dose / 100)`, and `range = diesel_per_def_tank x mpg`, and states that **DEF is
consumed at only about 2 to 3% of diesel so a DEF tank lasts several diesel fills, running the DEF tank empty forces an
ECU derate to roughly a 5 mph limp-home until refilled, DEF freezes at about 12 F (the SCR system thaws it in service),
the actual dose rate varies with engine, load, and duty cycle, and the OEM and the DEF quality govern** -- a planning
estimate, not the truck's metered rate.

## 2. The tile

### 2.1 `def-consumption` -- Why a DEF Tank Spans Several Fuel Fills (and Never Runs It Dry)

```
inputs:
  diesel_gal     gal     diesel consumed (0 = derive from miles / mpg below)
  trip_miles     mi      trip distance (used if diesel is 0)
  mpg            mpg     fuel economy (used if diesel is 0, and for range)
  dose_pct       %       DEF dose as a percent of diesel (default 2.5)
  def_tank_gal   gal     DEF tank size

diesel             = diesel_gal > 0 ? diesel_gal : trip_miles / mpg           [gal]
def_used           = diesel x dose_pct / 100                                  [gal]
diesel_per_def     = def_tank_gal / (dose_pct / 100)                          [gal]   diesel per full DEF tank
range_mi           = mpg > 0 ? diesel_per_def x mpg : null                    [mi]    range on a DEF fill
```

**Pinned worked example (a 13 gal DEF tank, 2.5% dose, 6.5 mpg truck).** A full DEF tank covers
`13 / 0.025 = ` **520 gal of diesel**, and at 6.5 mpg that is `520 x 6.5 = ` **3,380 miles** on one DEF fill -- several
diesel fills' worth, which is why DEF is topped every few fuel stops, not every one. Burning `200 gal` of diesel on a
leg consumes only `200 x 0.025 = ` **5.0 gal of DEF**. **Cross-check (a heavier dose shortens the range).** A hard-
pulling truck dosing at 3.0% covers `13 / 0.030 = 433 gal` of diesel, `433 x 6.5 = ` **2,817 miles** per DEF fill -- the
higher NOx load eats DEF faster and pulls the refill forward. The tile returns the DEF used, the diesel a DEF tank
covers, and the range on a fill.

## 3. Wiring

A `tools-data.js` row (group `J`, trades `["trucking", "logistics"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 2.5% example + the 3.0%
cross-check); `test/fixtures/compute-map.js` (`def-consumption` -> `computeDefConsumption` in `../../calc-trucking.js`);
`scripts/related-tiles.mjs` (-> `reefer-burn` / `cost-per-mile` / `fuel-surcharge`); `data/search/aliases.json` ("def
consumption", "diesel exhaust fluid", "def range", "def usage", "scr def dose", "def tank", "def per gallon diesel",
"def derate"); the id appended to the trucking renderers declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the diesel-vs-trip input paths, the
diesel-per-DEF-tank relation, the range scaling with mpg, and the error seams (non-finite, non-positive dose / tank /
diesel / miles / mpg by path). Hand-writes its renderer (mirroring the calc-trucking.js `reefer-burn` pattern). Lazy-
loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the DEF-used / diesel-per-tank / range stack wraps on a phone); render-no-nan + a11y on the new
tile, output read to the value (the 2.5% example -> 520 gal diesel, 3,380 mi).

## 5. Roadmap position

Adds the DEF planning number beside `reefer-burn` (the other consumable-fluid tile) and `cost-per-mile` (where DEF is a
variable cost). A DEF-cost-per-mile companion and a freeze-risk / tank-heater note for cold-climate operation are
deliberate future follow-ons. Further Group J growth stays evidence-driven.
