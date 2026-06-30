# roughlogic.com Specification v226 -- Seismic Base Shear (ASCE 7 §12.8 Equivalent Lateral Force) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v224..v226 (the ASCE 7 structural design-loads trio -- rain/ponding, load
> combinations, and seismic base shear). This closes the v224..v226 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the seismic base shear sets the lateral bracing,
> hold-downs, and anchorage a builder installs in a seismic region and that a solar or equipment installer checks for
> rooftop attachments. Adds one tile to **`calc-construction.js`** (Group E); no new module, group, or dependency.
> Inherits spec.md through spec-v225.md.
>
> **The gap, and the evidence for it.** The catalog handles gravity (`snow-load`, `rain-load-ponding`) and the wind
> lateral load (`wind-pressure`), but it has no seismic load at all -- and in much of the western US the earthquake
> demand, not the wind, governs the lateral system. ASCE 7 §12.8 reduces the seismic demand on a regular building to a
> single equivalent static base shear: the seismic response coefficient times the building weight, where the coefficient
> is the design spectral acceleration divided by the response-modification factor of the lateral system, bounded by a
> period-dependent cap and a code minimum. That base shear is what sizes the shear walls, the braced frames, the
> hold-downs, and the anchor bolts. The catalog can put the wind on a wall but cannot put the earthquake on the building,
> so a builder in a seismic zone has no estimate of the lateral force the structure has to carry.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The seismic weight and the
base shear are a force (`M L T^-2`, kips -- or lb if the weight is in lb; the relation is linear); the fundamental period
is a time (`T`, seconds); the seismic response coefficient, the design spectral accelerations (in g), the
response-modification factor, and the importance factor are `dimensionless`. The v18/v21 contract: any non-finite input,
a non-positive weight / SDS / response-modification factor / period, or an importance factor outside 1.0 to 1.5, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the base-shear relations by name; `editionNote`
names **ASCE 7 §12.8** (`Cs = SDS / (R / Ie)`, the upper bound `Cs <= SD1 / (T * (R / Ie))` for `T <= TL`, the minimum
`Cs >= max(0.044 * SDS * Ie, 0.01)`, and `V = Cs * W`), and states that **SDS and SD1 are the site's design spectral
accelerations from the USGS seismic design maps (the user supplies them, not a bundled hazard map), R is the
response-modification factor from ASCE 7 Table 12.2-1 for the chosen lateral system, the long-period transition TL is
assumed not to govern (T <= TL), this is the equivalent-lateral-force base shear for a regular building (not a modal or
response-history analysis, and not the vertical distribution to each level), and a licensed engineer governs** -- a
lateral-demand estimate, not a stamped seismic design.

## 2. The tile

### 2.1 `seismic-base-shear` -- Equivalent Lateral Force Base Shear

```
inputs:
  weight_kip   M L T^-2       seismic effective weight W (dead + applicable), kips
  sds          dimensionless  design spectral acceleration, short period (g)
  sd1          dimensionless  design spectral acceleration, 1-second period (g)
  r_factor     dimensionless  response-modification factor R (ASCE 7 Table 12.2-1)
  ie           dimensionless  seismic importance factor Ie (1.0-1.5), default 1.0
  period_s     T              approximate fundamental period Ta, s

cs_basic = sds / (r_factor / ie)
cs_cap   = sd1 / (period_s * (r_factor / ie))          # upper bound for T <= TL
cs_min   = max(0.044 * sds * ie, 0.01)                 # code minimum
cs       = max(cs_min, min(cs_basic, cs_cap))
base_shear_kip = cs * weight_kip
```

**Pinned worked example (light-frame bearing-wall building, short period).** A 200 kip building, high-seismic site
(`SDS = 1.0g`, `SD1 = 0.6g`), a light-frame bearing-wall system (`R = 6.5`), normal occupancy (`Ie = 1.0`), and a short
0.3 s period: `cs_basic = 1.0 / (6.5 / 1.0) = 0.1538`; `cs_cap = 0.6 / (0.3 * 6.5) = 0.3077` (does not bind);
`cs_min = max(0.044 * 1.0 * 1.0, 0.01) = 0.044` (does not bind); `cs = 0.1538`;
`V = 0.1538 * 200 = ` **30.8 kips of base shear**. **Cross-check (same building, longer 1.0 s period).** Take the same
building but a taller, more flexible 1.0 s period: `cs_basic = 0.1538` (unchanged); `cs_cap = 0.6 / (1.0 * 6.5) = 0.0923`
-- now the period cap governs; `cs = max(0.044, 0.0923) = 0.0923`; `V = 0.0923 * 200 = ` **18.5 kips**. The taller
building draws a 40 percent smaller base shear for the same weight, because the period-dependent cap recognizes that a
more flexible structure rides the short-period spectral peak less -- the trade-off ASCE 7 builds into the equivalent
lateral force method, and the reason the period is an input, not an afterthought.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the base-shear relations, `editionNote` naming ASCE 7 §12.8 with the
SDS/SD1-from-USGS / R-from-Table-12.2-1 / T-<=-TL / ELF-only / engineer-governs caveats);
`test/fixtures/worked-examples.json` (the short-period example + the period-cap cross-check); `test/fixtures/compute-map.js`
(`seismic-base-shear` -> `computeSeismicBaseShear` in `../../calc-construction.js`); `scripts/related-tiles.mjs`
(-> `wind-pressure` / `asce7-load-combinations` / `snow-load`); `data/search/aliases.json` ("seismic base shear",
"base shear", "equivalent lateral force", "asce 7 12.8", "seismic response coefficient", "cs seismic", "earthquake
load", "lateral force"); the id appended to the existing construction renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams
(non-finite, weight / SDS / R / period <= 0, importance factor out of 1.0 to 1.5, the cap-governs and min-governs paths).
Raise the `calc-construction.js` size cap if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the cap-governs and minimum-governs paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the Cs-basic / cap / min / governing
/ base-shear stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (200 kip / SDS 1.0 / R 6.5 /
0.3 s -> Cs 0.154, 30.8 kips).

## 5. Roadmap position

Closes the ASCE 7 structural design-loads batch (v224..v226). Completes the lateral side beside `wind-pressure` (the two
lateral demands a building is checked for, the larger governing), and its base shear is the seismic load the future
seismic load-combination set in `asce7-load-combinations` (v225) would consume. The vertical distribution of the base
shear to each story (ASCE 7 §12.8.3) and the redundancy / overstrength factors are deliberate future follow-ons.
