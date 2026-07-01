# roughlogic.com Specification v227 -- Window Solar Heat Gain and Conduction Cooling Load (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.87.0; was PROPOSED 2026-06-30). Batch spec-v227..v229 (the cooling-load-components trio -- the three distinct
> mechanisms a Manual J sums into a cooling load: solar and conduction through glass, internal gains from people and
> equipment, and conduction through the opaque envelope). This spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the cooling load is what the HVAC tech sizes the
> equipment against and what they reach for when a room will not hold setpoint. Adds one tile to **`calc-hvacsystems.js`**
> (Group C); no new module, group, or dependency. Inherits spec.md through spec-v226.md.
>
> **The gap, and the evidence for it.** The catalog has `manual-j-cooling` (a whole-house sensible-and-latent estimate),
> `cfm-per-ton`, `shr`, and `chiller-tons` (load to flow), but no transparent, editable tile for the single largest and
> most orientation-sensitive line on a cooling load: the window. A glazing area gains heat two ways -- the solar radiation
> that passes through it (area times the solar heat gain coefficient times the peak solar factor for that orientation and
> latitude) and the conduction driven by the indoor-outdoor temperature difference (area times U times the cooling-load
> temperature difference). On a west wall in summer the solar term dwarfs the conduction term by an order of magnitude,
> which is why a west-facing room overheats and why orientation and SHGC, not U-value, drive a glass cooling load. The
> catalog can estimate a whole house but cannot show, on its own line, what a specific window contributes -- the number a
> tech needs to diagnose a hot room or justify a shading or low-SHGC retrofit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The glazing area is an area
(`L^2`, ft^2); the solar, conduction, and total loads are a power (Btu/h); the peak solar heat gain factor
is a power per area (Btu/h per ft^2); the U-factor is a thermal transmittance (Btu/h per ft^2 per deg F); the
cooling-load temperature difference is a temperature (deg F); the solar heat gain coefficient is `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive
area, a negative U-factor / peak-solar-factor / SHGC, or an SHGC above 1, returns `{ error }` (a zero or negative CLTD is
allowed -- a shaded north window on a mild day can have little or no conduction term). Citation discipline (v19/v22):
`GOVERNANCE.general` over the solar and conduction relations by name; `editionNote` names the **ASHRAE / ACCA Manual J
fenestration cooling load** (`Q_solar = A * SHGC * PSF`, `Q_cond = A * U * CLTD`), and states that **the peak solar
factor (PSF / SHGF) is read from the ASHRAE/ACCA table for the window's orientation and the site latitude (a west or
east wall in summer runs far higher than a north wall; the user supplies it, not a bundled chart), the SHGC and U come
from the NFRC label, the CLTD for glass is the design temperature difference adjusted for the daily cycle, interior
shades and overhangs reduce the solar term by a separate shade factor, and this is one cooling-load component, not a
Manual J** -- a per-window aid, not the stamped load sheet.

## 2. The tile

### 2.1 `window-solar-heat-gain` -- Fenestration Solar and Conduction Cooling Load

```
inputs:
  area_ft2     L^2            glazing area (rough opening of glass), ft^2
  shgc         dimensionless  solar heat gain coefficient (NFRC label), 0 to 1
  psf          Btu/h/ft2      peak solar heat gain factor for the orientation/latitude, Btu/h per ft^2
  u_factor     Btu/h/ft2/F    fenestration U-factor (NFRC label), Btu/h per ft^2 per deg F
  cltd_f       deg F          cooling-load temperature difference for the glass, deg F

q_solar = area_ft2 * shgc * psf
q_cond  = area_ft2 * u_factor * cltd_f
q_total = q_solar + q_cond
```

**Pinned worked example (40 ft^2 west window, summer).** A 40 ft^2 west-facing window, SHGC 0.30, a west summer peak
solar factor of 200 Btu/h per ft^2, U-factor 0.30, and a 14 deg F glass CLTD: `q_solar = 40 * 0.30 * 200 = 2,400 Btu/h`;
`q_cond = 40 * 0.30 * 14 = 168 Btu/h`; `q_total = 2,400 + 168 = ` **2,568 Btu/h**, of which the solar gain is **2,400
Btu/h** -- more than fourteen times the conduction. **Cross-check (same window, north wall).** Turn the identical window
to face north, where the peak solar factor is about 40 Btu/h per ft^2: `q_solar = 40 * 0.30 * 40 = 480 Btu/h`;
`q_cond = 168 Btu/h` (unchanged); `q_total = ` **648 Btu/h**. The same glass, the same U, the same area -- a quarter the
cooling load purely from orientation. The conduction term barely moves; the solar term is the whole story, which is why
the fix for a hot west room is shading or a low-SHGC unit, not a thicker frame.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the solar and conduction relations, `editionNote` naming the ASHRAE/ACCA Manual J fenestration
load with the PSF-from-table / NFRC-label / shade-factor-separate / one-component caveats);
`test/fixtures/worked-examples.json` (the west-window example + the north-wall cross-check); `test/fixtures/compute-map.js`
(`window-solar-heat-gain` -> `computeWindowSolarHeatGain` in `../../calc-hvacsystems.js`); `scripts/related-tiles.mjs`
(-> `manual-j-cooling` / `internal-heat-gains` / `envelope-conduction-load`); `data/search/aliases.json` ("solar heat
gain", "window cooling load", "shgc", "fenestration load", "glass heat gain", "peak solar factor", "west window heat",
"manual j window"); the id appended to the existing hvacsystems renderers declare in `app.js`; the `// dims:` annotation;
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite,
area <= 0, negative U / PSF / SHGC, SHGC > 1, the zero-CLTD path). Raise the `calc-hvacsystems.js` size cap if needed
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the zero-CLTD path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the solar / conduction / total stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (40 ft^2 / SHGC 0.30 / PSF 200 -> 2,400 solar, 2,568 total).

## 5. Roadmap position

Opens the cooling-load-components batch (v227..v229). Complements `manual-j-cooling` (the whole-house worker) with a
transparent per-window line, and sits beside `internal-heat-gains` (v228) and `envelope-conduction-load` (v229); the
three sum, with the v220 infiltration load and the ventilation load, into a component-built cooling estimate, then feed
`cfm-per-ton` and `chiller-tons` for the airflow and water flow. An interior-shade and overhang shade-factor sub-mode is
a deliberate future follow-on.
