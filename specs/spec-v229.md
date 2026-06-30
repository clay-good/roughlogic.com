# roughlogic.com Specification v229 -- Opaque-Envelope Conduction Cooling Load (Sol-Air CLTD) (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v227..v229 (the cooling-load-components trio -- fenestration, internal
> gains, and opaque-envelope conduction). This closes the v227..v229 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the envelope conduction load is what the HVAC tech
> sizes against and what a cool-roof or insulation upgrade is justified by. Adds one tile to **`calc-hvacsystems.js`**
> (Group C); no new module, group, or dependency. Inherits spec.md through spec-v228.md.
>
> **The gap, and the evidence for it.** The last major term of a cooling load is conduction through the opaque envelope --
> the sunlit roof and walls. Unlike a heating load, it is not driven by the air temperature difference alone: the sun
> heats the surface well above the outdoor air, and that absorbed solar plus the thermal lag of the mass is captured by
> the cooling-load temperature difference (the sol-air CLTD), which for a dark roof in summer can be 70 deg F or more
> against a 95 deg F design day. The load is the assembly U-factor times the area times that CLTD. The catalog has
> `assembly-r-value` (which gives the U-factor) but nothing that turns it into a cooling load, and `snow-load` and
> `wind-pressure` handle the roof structurally but not thermally. The catalog can tell a tech the wall's R-value but not
> the cooling load that wall puts on the system -- or how much a reflective roof or added insulation would cut it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The surface area is an area
(`L^2`, ft^2); the conduction load is a power (Btu/h); the assembly U-factor is a thermal transmittance (Btu/h per ft^2 per deg F); the
cooling-load temperature difference is a temperature (deg F). The v18/v21 contract: any non-finite input, a non-positive area or U-factor, returns `{ error }` (a zero or
negative CLTD is allowed -- a shaded or north surface on a mild design day can carry little or no load, which the tile
reports rather than rejects). Citation discipline (v19/v22): `GOVERNANCE.general` over the conduction relation by name;
`editionNote` names the **ASHRAE / ACCA Manual J opaque-envelope cooling load** (`Q = U * A * CLTD`, the CLTD being the
sol-air cooling-load temperature difference for the surface), and states that **the CLTD comes from the ASHRAE/ACCA
table for the surface type, color, orientation, and design day (a dark, sunlit roof runs far above the air temperature
difference because of solar absorptance and mass lag, while a light or shaded surface runs near it; the user supplies
it, not a bundled chart), the U-factor is the whole-assembly value from `assembly-r-value` or the construction, and this
is one cooling-load component, not a Manual J** -- a per-surface aid, not the stamped load sheet.

## 2. The tile

### 2.1 `envelope-conduction-load` -- Opaque Wall / Roof Conduction Cooling Load

```
inputs:
  area_ft2   L^2            opaque surface area (net of openings), ft^2
  u_factor   Btu/h/ft2/F    whole-assembly U-factor, Btu/h per ft^2 per deg F
  cltd_f     deg F          sol-air cooling-load temperature difference for the surface, deg F

q_cond = u_factor * area_ft2 * cltd_f
```

**Pinned worked example (1,000 ft^2 dark roof, summer).** A 1,000 ft^2 roof at U-factor 0.05 (about R-20),
with a dark, sunlit sol-air CLTD of 70 deg F: `q_cond = 0.05 * 1,000 * 70 = ` **3,500 Btu/h** of roof conduction load.
**Cross-check (same roof, reflective / cool-roof surface).** Re-cover the same roof with a reflective membrane whose
solar absorptance drops the sol-air CLTD to 40 deg F: `q_cond = 0.05 * 1,000 * 40 = ` **2,000 Btu/h**. The U-factor, the
area, and the air temperature never changed -- but cutting the surface's solar absorptance dropped the roof cooling load
by 43 percent, because the sol-air CLTD, not the air temperature, is what conducts through a sunlit roof. That is the
entire case for a cool roof in one comparison, and it is invisible to a heating-style U-times-area-times-air-delta
calculation.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the conduction relation, `editionNote` naming the ASHRAE/ACCA Manual J opaque-envelope load with
the sol-air-CLTD-from-table / U-from-assembly / one-component caveats); `test/fixtures/worked-examples.json` (the
dark-roof example + the cool-roof cross-check); `test/fixtures/compute-map.js` (`envelope-conduction-load` ->
`computeEnvelopeConductionLoad` in `../../calc-hvacsystems.js`); `scripts/related-tiles.mjs` (-> `assembly-r-value` /
`window-solar-heat-gain` / `manual-j-cooling`); `data/search/aliases.json` ("envelope conduction", "roof cooling load",
"wall heat gain", "sol-air", "cltd", "cool roof savings", "opaque load", "u a cltd"); the id appended to the existing
hvacsystems renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, area or U <= 0, the zero-CLTD path).
Raise the `calc-hvacsystems.js` size cap if needed (dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the zero-CLTD path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the U / area / CLTD / load line wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1,000 ft^2 / U 0.05 / CLTD 70 -> 3,500 Btu/h).

## 5. Roadmap position

Closes the cooling-load-components batch (v227..v229). Consumes the U-factor that `assembly-r-value` produces and joins
`window-solar-heat-gain` (v227) and `internal-heat-gains` (v228); the three sum, with the v220 infiltration load and the
ventilation load, into a transparent component-built cooling estimate beside the whole-house `manual-j-cooling`. A
sol-air-CLTD-from-color/orientation table mode and a thermal-mass time-lag sub-mode are deliberate future follow-ons.
