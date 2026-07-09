# roughlogic.com Specification v482 -- ADPI Room Air Diffusion Selection (ASHRAE) (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter, and the air-distribution follow-on spec-v348 §5
> named ("a room-air-distribution (ADPI) check [is a] deliberate next follow-on"). Adds one tile to **`calc-hvac.js`**
> (Group C); no new module, group, or dependency. Inherits spec.md through spec-v481.md.
>
> **The gap, and the evidence for it.** The catalog sizes the grille (`grille-face-velocity`) and the airflow, but it
> never answers the question a supply-air designer actually has: will the air *mix* -- will the occupied zone stay inside
> the draft-and-stagnation comfort envelope? ASHRAE's answer is the Air Diffusion Performance Index, and its selection
> method is a single published table (ASHRAE Handbook -- Fundamentals, "Space Air Diffusion") that turns one number into
> a go/no-go: the ratio of the catalog throw T to the room's characteristic length L. For each outlet type and cooling
> load there is a T/L that maximizes ADPI and a band of T/L over which ADPI stays above the comfort threshold. A round
> ceiling diffuser peaks at T/L = 0.8 (the same at every load); a high sidewall grille wants ~1.8 but can only reach
> ADPI 68 at a heavy 80 Btu/hr-ft^2 load and 90 at a light one. The tile reproduces the ASHRAE selection table (from the
> Kansas State Miller/Nevins research, throw per Standard 70, ADPI per Standard 113) and reports the ratio, the optimum,
> the achievable ADPI, and whether the entered throw lands in the comfort band -- the number a designer reads off a
> diffuser catalog to know if the selection will actually mix the room.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The throw and the
characteristic length are lengths (`L`); the diffuser-type and cooling-load selectors, the T/L ratio, the optimum ratio,
and the ADPI percentages annotate `dimensionless`. The v18/v21 contract: an unknown diffuser type, a non-finite input,
or a non-positive throw or characteristic length returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the method by name; `editionNote` names the **ASHRAE Handbook -- Fundamentals, Space Air
Diffusion chapter, the ADPI Selection Guide table** (throw per ASHRAE Standard 70, ADPI per Standard 113, the Miller /
Nevins Kansas State research), states that **the tabulated ratios are for cooling mode at the listed floor loads (20 to
80 Btu/hr-ft^2), the throw T is the manufacturer's isothermal catalog throw to the outlet's terminal velocity (50 fpm /
T0.25 for most types, 100 fpm / T0.5 for ceiling slots), the characteristic length L is the outlet-specific distance the
table footnotes define (to the wall or the midplane between outlets, adjusted from the 9 ft tabulated ceiling), and the
result predicts the ADPI a good selection can reach -- heating, the light-troffer row (whose throw basis the published
reproductions disagree on), and the final noise (NC) and dumping checks are separate** -- a selection aid, not a stamped
air-distribution design; the design engineer and the manufacturer's data govern.

## 2. The tile

### 2.1 `adpi-diffuser-selection` -- The ASHRAE Throw-to-Length Ratio That Mixes the Room

```
inputs:
  diffuser_type   select   high sidewall / circular ceiling / sill straight / sill spread / ceiling slot / perforated
  cooling_load    select   room cooling load 20 / 40 / 60 / 80 Btu/hr-ft^2 (perforated is load-independent)
  throw_ft        ft       catalog isothermal throw to the outlet's terminal velocity (50 fpm most; 100 fpm ceiling slot)
  char_length_ft  ft       characteristic length L (to wall or midplane between outlets, per the ASHRAE footnote)

ratio      = throw_ft / char_length_ft
row        = ADPI table[diffuser_type][nearest 20/40/60/80]   (perforated: single load-independent row)
in_band    = row.lo <= ratio <= row.hi          (ADPI above the row's published threshold)
target     = row.opt x char_length_ft           (the throw to spec for maximum ADPI)
```

**Pinned worked example (round ceiling diffuser, moderate load).** A circular ceiling diffuser on a 10 ft module
(L = 10 ft) at a 40 Btu/hr-ft^2 cooling load, catalog throw to 50 fpm `T0.25 = 8 ft`: `ratio = 8 / 10 = ` **0.80** --
exactly the max-ADPI optimum (0.8 at every load for this type), so the selection reaches the table maximum **ADPI 88**,
inside the ADPI-over-80 band of 0.5 to 1.5. The throw to spec is `0.8 x 10 = ` **8 ft**, which is what the catalog
gives -- a clean selection. **Cross-check (the load ceiling a heavy room puts on comfort).** A high sidewall grille at a
heavy 80 Btu/hr-ft^2 load with L = 20 ft, thrown to its optimum `ratio = 1.8` (`T0.25 = 36 ft`): it is at the optimum,
yet the achievable **ADPI is only 68** -- no T/L reaches the 80 threshold at this load (the band is blank), so the tile
returns the optimum but flags that the load itself, not the throw, caps the comfort. Drop the load and the same grille
climbs to ADPI 90; that is the design lesson the index carries.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the round-ceiling max-ADPI example +
the high-sidewall load-capped cross-check); `test/fixtures/compute-map.js` (`adpi-diffuser-selection` ->
`computeAdpiSelection` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `grille-face-velocity` /
`window-solar-heat-gain` / `duct-velocity-pressure`); `data/search/aliases.json` ("adpi", "air diffusion performance
index", "room air distribution", "throw ratio", "diffuser selection", "throw to length", "space air diffusion",
"air mixing"); the id appended to the hvac renderers declare in `app.js`; the `// dims:` annotation; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, a load-independent type (ceiling slot), the
in-band / out-of-band flags, and the error seams (unknown type, non-finite, throw / length <= 0). Hand-writes its
renderer (two `makeSelect` and two `makeNumber` fields, mirroring `grille-face-velocity`). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit (the ratio / optimum / ADPI / band stack wraps on a phone); render-no-nan + a11y on
the new tile, output read to the value (the round-ceiling example -> ratio 0.80, ADPI 88, in band).

## 5. Roadmap position

Executes the spec-v348 §5 ADPI follow-on and closes the supply-air-distribution corner: `grille-face-velocity` sizes the
outlet, and this tells the designer whether the throw that outlet gives will actually mix the room. The light-troffer
row (whose throw basis the published reproductions disagree on), a heating-mode companion, and a noise-criterion (NC)
selection helper are deliberate future follow-ons. Further Group C growth stays evidence-driven.
