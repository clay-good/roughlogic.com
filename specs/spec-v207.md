# roughlogic.com Specification v207 -- Sprinkler Precipitation Rate and Matched-Precipitation Check (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-06-29, package 0.84.0; was PROPOSED 2026-06-26). Batch spec-v207..v211 (landscape irrigation and planting -- the install-side
> cluster the catalog never had: precipitation rate, zone runtime, drip flow, plant spacing, sod takeoff).**
> In-scope catalog expansion under the spec-v106 trades-only charter: landscape irrigation is designed and
> installed by irrigation/landscape techs. Adds one tile to **`calc-agriculture.js`** (Group L); no new
> module, group, or dependency. Inherits spec.md through spec-v206.md.
>
> **The gap, and the evidence for it.** The catalog has three irrigation tiles, but every one of them is
> aimed elsewhere: `irrigation-requirement` is ET-based *crop* demand in acre-feet, `irrigation-uniformity`
> grades catch-can readings, and `nozzle-flow-pressure` / `sprayer-field-capacity` are *chemical* spray rigs.
> Nothing in the catalog gives a landscape installer the first number a residential or commercial zone is
> designed around: the precipitation rate -- how fast a valve zone puts water on the ground, in inches per
> hour. It is `PR = 96.3 x zone GPM / zone area`, and it is the number that decides the runtime and the
> reason you never put spray heads and rotors on the same valve (they apply water at wildly different rates).
> The catalog can size a farm's seasonal water but cannot tell a tech the in/hr of the zone in front of them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The zone flow
is a volumetric flow (`L^3/T`, gpm); the zone area is `L^2` (ft^2); the precipitation rate is a velocity
(`L/T`, in/hr -- depth per time). The 96.3 constant is the standard irrigation conversion (1 gpm spread over
1 ft^2 = 96.3 in/hr: 231 in^3/gal / 144 in^2/ft^2 x 60 min/hr). The v18/v21 contract: any non-finite input,
or a non-positive flow or area, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general`
over the precipitation-rate relation by name; `editionNote` names the **Irrigation Association** design
references and the major-manufacturer (Rain Bird / Hunter) design manuals where the 96.3 constant and the
matched-precipitation rule are published, and states that **the head flows come from the manufacturer's
nozzle chart at the operating pressure, the zone area is the area the heads actually cover, and this is a
design-rate estimate, not a system audit (`irrigation-uniformity` audits the installed result)** -- a
sizing aid, not a commissioning report.

## 2. The tile

### 2.1 `sprinkler-precip-rate` -- Zone Precipitation Rate and Matched-Precipitation Check

```
inputs:
  zone_gpm   L^3/T   total flow of all heads on the valve, gpm (sum of nozzle-chart flows)
  zone_ft2   L^2     ground area the zone's heads cover, ft^2

precip_in_hr = 96.3 x zone_gpm / zone_ft2
```

**Pinned worked example (rotor lawn zone).** Six rotors at 2.5 gpm each = 15 gpm total, covering a 40 ft x
30 ft = 1200 ft^2 lawn: `PR = 96.3 x 15 / 1200 = 1444.5 / 1200 = ` **1.20 in/hr** -- the rate that sets the
zone's runtime.
**Cross-check (spray zone, why you never mix them).** Six fixed-spray nozzles at 2.0 gpm = 12 gpm over a
20 ft x 15 ft = 300 ft^2 bed: `PR = 96.3 x 12 / 300 = ` **3.85 in/hr**. The same 12 to 15 gpm puts water
down roughly three times faster from sprays than rotors -- which is exactly why sprays and rotors on one
valve flood one and starve the other, and why matched precipitation is a design rule, not a preference.

## 3. Wiring

A `tools-data.js` row (group `L`, trade `["landscaping","agriculture"]`); a `tile-meta.js` `_TILES` entry;
a `citations.js` entry (`GOVERNANCE.general`, the precipitation-rate relation, `editionNote` naming the
Irrigation Association / manufacturer design references and the design-rate-not-audit caveat);
`test/fixtures/worked-examples.json` (rotor example + spray cross-check); `test/fixtures/compute-map.js`
(`sprinkler-precip-rate` -> `computeSprinklerPrecipRate` in `../../calc-agriculture.js`);
`scripts/related-tiles.mjs` (-> `irrigation-zone-runtime` / `irrigation-uniformity` / `drip-zone-flow`);
`data/search/aliases.json` ("precipitation rate", "precip rate", "in per hour", "matched precipitation",
"sprinkler rate", "rotor vs spray"); the id appended to the existing agriculture renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning the example, the cross-check, and error seams (non-finite, flow/area <= 0). Raise the
`calc-agriculture.js` size cap by ~20 percent if needed (dated comment). Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the PR line wraps on a phone);
render-no-nan + a11y sweep, output read to the value (15 gpm / 1200 ft^2 -> 1.20 in/hr).

## 5. Roadmap position

Opens the landscape-irrigation install cluster (v207..v211). Its precipitation rate is the direct input to
`irrigation-zone-runtime` (v208); `drip-zone-flow` (v209) is the drip-system sibling; `irrigation-uniformity`
audits what the design produces. A controller-program multi-zone scheduler is a deliberate future tile, not
an automatic landing.
