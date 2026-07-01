# roughlogic.com Specification v228 -- Internal Heat Gains: People, Lighting, Equipment (calc-hvacsystems.js, Group C, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.87.0; was PROPOSED 2026-06-30). Batch spec-v227..v229 (the cooling-load-components trio -- fenestration, internal
> gains, and opaque-envelope conduction). This spec is the middle of the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the internal gain is the cooling-load line the HVAC
> tech adds for occupants and plug load, and the one that explains why a packed conference room or a server closet runs
> hot. Adds one tile to **`calc-hvacsystems.js`** (Group C); no new module, group, or dependency. Inherits spec.md
> through spec-v227.md.
>
> **The gap, and the evidence for it.** The third major term of a cooling load -- after the envelope and the glass -- is
> the heat the building makes inside: people, lights, and equipment. Each occupant throws off a sensible and a latent
> load (the latent is the moisture they breathe and perspire, and it is why a crowded room needs dehumidification, not
> just more air), lighting and plug load convert their watts to Btu/h at 3.412 Btu/h per watt, and the split between
> sensible and latent sets the coil's job. The catalog computes the electrical lighting load (`commercial-lighting-load`,
> for the panel) but never the thermal one (for the coil), and has nothing for occupant or equipment gain. The catalog
> can size the breaker for the lights but cannot tell a tech how much cooling those same lights, those people, and that
> equipment add to the room.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The per-person sensible and
latent rates and the sensible, latent, and total loads are a power (`M L^2 T^-3`, Btu/h); the lighting and equipment
power are a power (W); the occupant count is `dimensionless`; the use factor is `dimensionless`. The 3.412 Btu/h per watt
is the watt-to-Btu/h conversion, carried as a named constant. The v18/v21 contract: any non-finite input, a negative
occupant count / lighting watts / equipment watts / per-person rate, or a use factor outside 0 to 1, returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the gain relations by name; `editionNote` names the
**ASHRAE / ACCA Manual J internal-gain method** (occupant sensible and latent from the activity-level table, lighting and
equipment at `3.412 * W`), and states that **the per-person sensible and latent rates come from the ASHRAE activity
table (a seated office occupant is roughly 245 Btu/h sensible and 200 latent; heavier activity is far higher; the user
supplies the rate), the lighting use factor accounts for the fraction actually on (and a ballast factor for the fixture
type), recessed lighting vented to a return plenum delivers part of its heat to the plenum rather than the room, and
this is one cooling-load component, not a Manual J** -- a room-gain aid, not the stamped load sheet.

## 2. The tile

### 2.1 `internal-heat-gains` -- People, Lighting, and Equipment Cooling Load

```
inputs:
  occupants         dimensionless  number of people in the space
  sens_per_person   M L^2 T^-3     sensible gain per person, Btu/h (default 245, seated office work)
  lat_per_person    M L^2 T^-3     latent gain per person, Btu/h (default 200, seated office work)
  lighting_w        M L^2 T^-3     installed lighting power, W
  equipment_w       M L^2 T^-3     installed equipment / plug power, W
  use_factor        dimensionless  fraction of lighting + equipment actually on, 0 to 1 (default 1.0)

q_people_sensible = occupants * sens_per_person
q_people_latent   = occupants * lat_per_person
q_lighting        = lighting_w  * 3.412 * use_factor
q_equipment       = equipment_w * 3.412 * use_factor
q_sensible        = q_people_sensible + q_lighting + q_equipment
q_latent          = q_people_latent
q_total           = q_sensible + q_latent
```

**Pinned worked example (small office, six people).** Six seated occupants at 245 Btu/h sensible and 200 latent each,
800 W of lighting and 1,200 W of equipment, all on (use factor 1.0): `q_people_sensible = 6 * 245 = 1,470 Btu/h`;
`q_people_latent = 6 * 200 = 1,200 Btu/h`; `q_lighting = 800 * 3.412 = 2,730 Btu/h`;
`q_equipment = 1,200 * 3.412 = 4,094 Btu/h`; `q_sensible = 1,470 + 2,730 + 4,094 = 8,294 Btu/h`;
`q_latent = 1,200 Btu/h`; `q_total = ` **9,494 Btu/h** (a sensible-heavy load -- the plug and lighting load dominates a
lightly-occupied office). **Cross-check (packed conference room, twenty people).** Twenty occupants, 600 W lighting,
300 W equipment: `q_people_sensible = 20 * 245 = 4,900`; `q_people_latent = 20 * 200 = 4,000`;
`q_lighting = 600 * 3.412 = 2,047`; `q_equipment = 300 * 3.412 = 1,024`; `q_sensible = 4,900 + 2,047 + 1,024 = 7,971`;
`q_latent = 4,000`; `q_total = ` **11,971 Btu/h**. The occupant count flips the load from sensible-heavy to
latent-heavy: the conference room's 4,000 Btu/h of latent (a third of its total) is moisture a sensible-only "more
airflow" fix never removes, which is why dense-occupancy spaces are sized on the latent load, not just the tonnage.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the gain relations, `editionNote` naming the ASHRAE/ACCA Manual J internal-gain method with the
activity-table / use-factor / plenum-return / one-component caveats); `test/fixtures/worked-examples.json` (the office
example + the conference-room cross-check); `test/fixtures/compute-map.js` (`internal-heat-gains` ->
`computeInternalHeatGains` in `../../calc-hvacsystems.js`); `scripts/related-tiles.mjs` (-> `manual-j-cooling` /
`window-solar-heat-gain` / `shr`); `data/search/aliases.json` ("internal heat gain", "occupant load", "people heat
gain", "lighting heat gain", "equipment heat gain", "plug load cooling", "latent people load", "3.412 watts btu"); the
id appended to the existing hvacsystems renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus
+ tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, negative occupants /
watts / rates, use factor out of 0 to 1). Raise the `calc-hvacsystems.js` size cap if needed (dated comment).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the use-factor path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the people / lighting / equipment / sensible / latent /
total stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (6 people / 800 W / 1,200 W ->
8,294 sensible, 9,494 total).

## 5. Roadmap position

The middle of the cooling-load-components batch (v227..v229). Sits between `window-solar-heat-gain` (v227) and
`envelope-conduction-load` (v229); the three sum, with the v220 infiltration load, into a component-built cooling
estimate whose sensible/latent split feeds `shr` and whose tonnage feeds `cfm-per-ton`. A latent-from-activity table
mode and a plenum-return lighting split are deliberate future follow-ons.
