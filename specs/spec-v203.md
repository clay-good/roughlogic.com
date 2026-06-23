# roughlogic.com Specification v203 -- Flange Pressure-Temperature Rating (ASME B16.5) (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v199..v203 (plumbing/pipefitting -- hydronic radiant,
> condensate return, and three fabrication/process layout tiles).** In-scope catalog expansion under the
> spec-v106 trades-only charter: the flange-rating reference that pairs with the existing flange bolt-up
> and pipe-pressure tiles. Adds one tile to **`calc-pipefit.js`** (Group B); no new module, group, or
> dependency. Inherits spec.md through spec-v202.md.
>
> **The gap, and the evidence for it.** The catalog torques a flange (`flange-bolt-torque`) and rates the
> pipe wall (`pipe-pressure-rating`), but never answers the question that comes first on a process or steam
> line: what pressure is this flange class good for at this temperature? Every fitter knows "150-pound is
> 285 cold," but the rating drops with temperature, and a 300- or 600-pound flange follows its own curve.
> That pressure-temperature rating is a fixed ASME B16.5 table lookup, the same kind of bundled reference
> the catalog already ships for NEC tables, and there is no flange-rating tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The maximum
allowable working pressure is a pressure (`M L^-1 T^-2`, psig); the temperature is an angle-free thermal
input (degrees F); the flange class is an enumerated flag (150 / 300 / 600 / 900 / 1500 / 2500). The
v18/v21 contract: any non-finite temperature, an unlisted class, or a temperature outside the bundled
table range returns `{ error }` (the last with an "interpolate from the governing edition" message); the
reported rating is read from the bundled table with linear interpolation between the table temperatures.
Citation discipline (v19/v22): `GOVERNANCE.general` over the rating-lookup and interpolation by name;
`editionNote` names **ASME B16.5** and states that **the bundled ratings are Material Group 1.1 (carbon
steel, e.g. A105) and other material groups have their own tables**, that the value is the flange's
rating and the weakest component (gasket, bolting, the mating pipe) can still govern the joint, and that
the AHJ and the engineer of record govern.

## 2. The tile

### 2.1 `flange-rating` -- ASME B16.5 Pressure-Temperature Rating (Group 1.1)

```
inputs:
  flange_class   dimensionless   150 | 300 | 600 | 900 | 1500 | 2500
  temp_f         Theta           service temperature, F

# bundled B16.5 Group 1.1 (carbon steel) ratings, psig, at table temperatures:
#   100F   200F   300F   400F   500F   600F   650F
# 150: 285   260    230    200    170    140    125
# 300: 740   680    655    635    605    570    550
# 600:1480  1360   1310   1265   1205   1135   1100
# (900 / 1500 / 2500 scale from the 600 column x 1.5 / 2.5 / 4.17)
mawp = interpolate(table[flange_class], temp_f)         # linear between table temperatures
```

**Pinned worked example.** A Class 150 A105 flange at 400 F: straight off the table, **200 psig**. The
familiar "150-pound = 285 psi cold" is the same table at 100 F.
**Cross-check (higher class, same temperature).** A Class 300 A105 flange at 400 F reads **635 psig** --
roughly three times the 150-pound rating at the same temperature, as the class ratio implies. A value
between table temperatures (say 350 F on Class 150) interpolates linearly to 215 psig.

## 3. Wiring

A `tools-data.js` row (group `B`, trade `["pipefitting"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the lookup/interpolation, `editionNote` naming ASME B16.5, the
Group-1.1-only and weakest-component caveats); `test/fixtures/worked-examples.json` (example +
cross-check + an interpolated point); `test/fixtures/compute-map.js` (`flange-rating` ->
`computeFlangeRating` in `../../calc-pipefit.js`); `scripts/related-tiles.mjs` (-> `flange-bolt-torque` /
`pipe-pressure-rating` / `hydrostatic-test`); `data/search/aliases.json` ("flange rating", "150 pound
flange", "300 lb flange", "B16.5", "pressure temperature rating", "flange class"); the id appended to the
existing pipefit renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, the cross-check, the interpolated point,
and error seams (non-finite temp, unlisted class, temp out of table range). Raise the `calc-pipefit.js`
and `citations.js` size caps if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+3 fixtures including the interpolated point, the new fuzzer block); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the class /
temperature inputs and the rating wrap on a phone); render-no-nan + a11y sweep, output read to the value
(150 / 400 F -> 200 psig).

## 5. Roadmap position

Completes the flanged-joint trio: rate the flange here, rate the pipe at `pipe-pressure-rating`, torque
the bolts at `flange-bolt-torque`. Additional material groups (stainless 2.x, low-alloy 1.x variants) and
a gasket-seating / bolt-load check stay evidence-driven follow-ons. Closes the v199..v203 batch.
