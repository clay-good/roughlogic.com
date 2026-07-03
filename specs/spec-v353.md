# roughlogic.com Specification v353 -- Pool Free-Chlorine Dose by Product (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v353..v355 (the pool-and-water chemistry trio -- the dosing
> and equipment numbers the salt and alkalinity tiles never cover: the free-chlorine dose by product (this spec), the pool
> heater sizing and heat-up time (v354), and the breakpoint-chlorination dose (v355).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `pool-salt-dose` doses a salt generator and
> `pool-alkalinity-adjust` the buffer, but the everyday task -- how much liquid chlorine, cal-hypo, or dichlor to add to
> raise the free chlorine a target amount for a given pool volume -- has no tile. Adds one tile to the existing
> **`calc-treatment.js`** module (Group M); no new group, trade, or dependency. Inherits spec.md through spec-v352.md.
>
> **The gap, and the evidence for it.** A ppm is a mass of chlorine per volume of water, so the product to add is the
> chlorine mass needed divided by the product's available-chlorine fraction: `lb_chlorine = ppm x (gallons/1e6) x 8.34`,
> and `product = lb_chlorine / available_fraction`, converted to the product's units (weight for dry, fluid volume for
> liquid). For a 15,000 gal pool needing a 2 ppm free-chlorine bump, the chlorine mass is `2 x 0.015 x 8.34 = 0.25 lb`;
> supplied as 65% cal-hypo that is `0.25/0.65 = 0.385 lb = 6.2 oz` of granules, or as 12.5% liquid chlorine
> `0.25/0.125 = 2.0 lb = 25.6 fl oz` -- the scoop or the jug a pool tech pours, and a calculation the salt and alkalinity
> tiles never made. The available-chlorine fraction is the whole difference between products.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The target ppm rise is a
dimensionless concentration; the pool volume is a volume (gal); the chlorine mass and dry-product weight are forces (lb, oz);
the liquid-product amount is a volume (fl oz, gal); the available-chlorine fraction is a dimensionless percentage. The
v18/v21 contract: any non-finite input, or a ppm, volume, or available fraction at or below zero, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the chlorine-dose mass balance by name; `editionNote` names **the
chlorine mass `lb = ppm x (gal/1e6) x 8.34`, the product `= lb / available_fraction`, the common available-chlorine values
(12.5% liquid sodium hypochlorite, 65% cal-hypo, 56-62% dichlor, 90% trichlor), and the ~10 lb/gal liquid density for the
fluid-ounce conversion**, and states that **this returns the product dose for a target free-chlorine rise -- it is a straight
mass balance (it does not subtract the chlorine demand the water will consume, which `chlorine-demand` estimates, so add for
demand when shocking), uses the entered available fraction and pool volume, and does not account for stabilizer (CYA)
effects on active chlorine or the pH shift a given product causes; and this is a service aid** -- the pool's measured
chemistry and the local health code govern.

## 2. The tile

### 2.1 `pool-chlorine-dose` -- Pool Free-Chlorine Dose by Product

```
inputs:
  ppm       ppm      target free-chlorine rise
  gallons   gal      pool volume
  product   -        liquid-12.5 | cal-hypo-65 | dichlor-56 | trichlor-90 | custom
  avail     %        available-chlorine fraction (from product, or custom)

lb_cl   = ppm * (gallons/1e6) * 8.34               ; chlorine mass, lb
lb_prod = lb_cl / (avail/100)                       ; product weight, lb
dry_oz  = lb_prod * 16                              ; dry product, oz
liq_floz = (lb_prod/10) * 128                       ; liquid product, fl oz (~10 lb/gal)
```

**Pinned worked example (a 15,000 gal pool, +2 ppm, 65% cal-hypo).** `lb_cl = 2 x 0.015 x 8.34 = 0.250 lb`;
`lb_prod = 0.250/0.65 = 0.385 lb = 6.2 oz` of cal-hypo granules. **Cross-check (the same 0.250 lb of chlorine as 12.5%
liquid).** `lb_prod = 0.250/0.125 = 2.00 lb = 0.20 gal = 25.6 fl oz` of liquid chlorine -- five times the weight of the
cal-hypo because liquid is a fifth the strength, the trade a tech makes between a cheap heavy jug and a concentrated scoop.
The non-finite and non-positive error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `M`, trades `["pool-service","water-operations"]`, matching `pool-salt-dose`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the chlorine-dose mass balance, `editionNote`
naming `lb = ppm x (gal/1e6) x 8.34`, the available fractions, the liquid density, and the no-demand-subtracted,
no-CYA-effect caveats); `test/fixtures/worked-examples.json` (the cal-hypo example + the liquid cross-check);
`test/fixtures/compute-map.js` (`pool-chlorine-dose` -> `computePoolChlorineDose` in `../../calc-treatment.js`);
`scripts/related-tiles.mjs` (-> `pool-salt-dose` / `pool-alkalinity-adjust` / `breakpoint-chlorination` / `chlorine-demand`);
`data/search/aliases.json` ("pool chlorine dose", "shock dose pool", "cal hypo dose", "liquid chlorine pool", "raise free
chlorine", "ppm chlorine pool", "how much chlorine", "pool shock amount", "chlorine product dose"); the id appended to the
existing treatment renderers block in `app.js`; the `// dims:` annotation (`ppm`/`avail` dimensionless, `gallons` volume,
masses force, liquid volume); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the dry-vs-liquid conversion, the available-fraction scaling, and the non-positive / non-finite error seams. No new module;
re-pin `calc-treatment.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the dry/liquid assertions); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `lb_cl` / product dose stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (15,000 gal +2 ppm cal-hypo -> 6.2 oz).

## 5. Roadmap position

Opens the pool-and-water chemistry batch (v353..v355) in `calc-treatment.js`, adding the everyday chlorine dose to the salt
and alkalinity tiles. The pool heater sizing (v354) and breakpoint chlorination (v355) follow. A demand-inclusive shock dose
chained from `chlorine-demand`, a CYA-adjusted active-chlorine correction, and the per-product pH-shift note are the
deliberate next follow-ons once the trio lands.
