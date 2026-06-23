# roughlogic.com Specification v138 -- Field-Effective Dehumidifier Capacity at Chamber Grain Depression (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23. Batch spec-v136..v140.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile that derates a nameplate AHAM pint rating
> to its field output as the chamber dries, and turns the derate into the unit-count consequence. Adds
> one tile to **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits
> spec.md through spec-v137.md.
>
> **The gap, and the evidence for it.** The `dehumidifier` tile sizes by AHAM pints, and S500 itself
> warns that the AHAM rating (taken at a high-grain-depression test condition) overstates what a
> refrigerant / LGR unit removes once the chamber dries and the inlet grains fall -- output collapses,
> and the drying plateaus. Techs read the nameplate, place that many units, and stall in the back
> third of the job. The fix is the multiplication the catalog never does: nameplate times the derate
> the tech reads off the unit's own performance curve at the current chamber GPP, then the honest unit
> count that follows. No tile shows that the count goes **up**, not down, as the chamber dries.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
AHAM nameplate and required-demand pints/day and the effective output are a water mass-rate
(`M/T`, reported as pints/day); the derate factor is `dimensionless` and bounded 0..1; the unit
counts are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive nameplate or
demand, or a derate factor outside (0, 1] returns `{ error }`; the divisions are by a guarded-positive
nameplate and effective rate. Citation discipline (v19/v22): `GOVERNANCE.general` over the
AHAM-overstates-field caution, by name; the derate factor is **read by the operator off the unit's
published performance curve at the measured chamber GPP** -- the curve and the psychrometric reality
govern, this tile only carries the multiplication and the count. Effective output uses a linear derate
screen, the working-band approximation manufacturers' curves support.

## 2. The tile

### 2.1 `dehumidifier-derate` -- Field-Effective Capacity at Chamber Grain Depression

```
inputs:
  aham_pints_per_day    M/T            nameplate AHAM rating per unit (pints/day)
  derate_factor         dimensionless  0..1, read off the unit's curve at the current chamber GPP (default 0.5)
  required_pints_per_day M/T           job demand (e.g. from evaporation-load)

effective_pints   = aham_pints_per_day x derate_factor
units_by_nameplate = ceil(required_pints_per_day / aham_pints_per_day)
units_by_field     = ceil(required_pints_per_day / effective_pints)
shortfall_units    = units_by_field - units_by_nameplate
```

**Pinned worked example.** A 130 ppd nameplate unit at a mid-drying derate of 0.5, against a 300 ppd
demand: `effective = 130 x 0.5 = 65 ppd`; `units_by_nameplate = ceil(300/130) = 3`;
`units_by_field = ceil(300/65) = 5`; `shortfall = 2` -- two more units than the nameplate count
implies, the gap that stalls the job.
**Cross-check (the plateau deepens as it dries).** Late stage, low chamber GPP, derate 0.3:
`effective = 39 ppd`, `units_by_field = ceil(300/39) = 8`, `shortfall = 5`. As the chamber dries the
field count rises, not falls -- the classic drying plateau, made explicit. The curve governs the
factor; this is a screen.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration", "hvac"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the AHAM-vs-field derate and the linear screen,
`editionNote` naming ANSI/IICRC S500 and the read-your-curve caveat, the screen scope);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`dehumidifier-derate` -> `computeDehumidifierDerate` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `dehumidifier` / `grains-removed` / `evaporation-load`);
`data/search/aliases.json` ("dehumidifier derate", "AHAM vs field", "effective pints", "grain
depression output", "drying plateau", "LGR performance"); the id appended to the existing
`RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams
(non-finite, nameplate/demand <= 0, derate outside (0,1]). Raise the `calc-restoration.js` size cap
by ~20 percent if needed (dated comment); bump the `citations.js` cap if needed. Lazy-loaded, absent
from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the effective rate and the two
counts wrap on a phone); render-no-nan + a11y sweep, output read to the value (130 ppd / 0.5 / 300 ppd
-> 65 ppd, 3 vs 5 units, shortfall 2).

## 5. Roadmap position

Closes the loop between the refrigerant sizing tile and the in-situ `grains-removed` check, and motivates
desiccant selection (v140) where the derate makes refrigerant uneconomic. Further Group D growth stays
evidence-driven.
