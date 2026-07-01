# roughlogic.com Specification v220 -- Infiltration Heating / Cooling Load (Sensible + Latent) (calc-hvacservice.js, Group C, 1 New Tile)

> **Status: LANDED (2026-06-30, package 0.87.0; was PROPOSED 2026-06-30). Batch spec-v218..v220 (the residential air-tightness and ventilation trio -- the
> blower-door result, the ASHRAE 62.2 whole-house ventilation, and the infiltration load this spec adds). This closes
> the v218..v220 batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the infiltration component of the design load is
> a load-calc step the HVAC tech and energy auditor own. Adds one tile to **`calc-hvacservice.js`** (Group C); no new
> module, group, or dependency. Inherits spec.md through spec-v219.md.
>
> **The gap, and the evidence for it.** The catalog carries the whole-house load through the Manual J worker
> (`manual-j-heating` / `manual-j-cooling`) and the quick `cfm-per-ton` and `balance-point` checks, but it has no
> standalone tile for the one load component a blower-door test directly quantifies: the heat carried by the air the
> envelope leaks. The air-side equations are the field's most-used pair -- sensible `Q = 1.08 * cfm * dT` and latent
> `Q = 0.68 * cfm * dGr` -- yet nothing in Group C exposes them against an infiltration airflow, so a tech who just
> measured `cfm_nat` on the blower door (v218) has no way to turn it into the Btu/h it adds to the heating and cooling
> design loads. The catalog can run a full Manual J but cannot show, on its own line, how much of the load is just the
> house breathing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The infiltration airflow
is an airflow (`L^3 T^-1`, cfm); the design temperature difference is a temperature difference (`T`, deg F); the
humidity-ratio difference is `dimensionless` (grains of moisture per pound of dry air, a mass ratio carried in the
standard's grain units); the sensible, latent, and total loads are a power (`M L^2 T^-3`, Btu/h). The 1.08 and 0.68 are
the ASHRAE standard-air air-side factors (the sensible `60 * rho * cp` and the latent `60 * rho * h_fg / 7000` grouped
into the trade's working constants at sea-level standard air). The v18/v21 contract: any non-finite input, a
non-positive airflow, or a negative humidity-ratio difference returns `{ error }` (a negative or zero design dT is
allowed -- it simply yields a zero or reversed sensible term, which the tile reports rather than rejects). Citation
discipline (v19/v22): `GOVERNANCE.general` over the sensible and latent air-side relations by name; `editionNote` names
the **ASHRAE Handbook of Fundamentals** air-side sensible (`q_s = 1.08 * Q * dT`) and latent (`q_l = 0.68 * Q * dW_gr`)
equations, and states that **the 1.08 and 0.68 are sea-level standard-air constants (an altitude correction is a
separate manual adjustment), the airflow is the natural infiltration from a blower-door test or a design infiltration
estimate, this is the infiltration component of the load only (envelope conduction, solar, and internal gains are
separate Manual J line items), and this is a design-load aid, not a stamped Manual J** -- one component, not the whole
load sheet.

## 2. The tile

### 2.1 `infiltration-load` -- Infiltration Heating / Cooling Load (Sensible + Latent)

```
inputs:
  cfm            L^3 T^-1       infiltration airflow (blower-door cfm_nat or a design estimate), cfm
  delta_t_f      T              design indoor-outdoor dry-bulb difference, deg F
  delta_gr       dimensionless  design indoor-outdoor humidity-ratio difference, grains/lb (default 0 = sensible only)

q_sensible = 1.08 * cfm * delta_t_f          # Btu/h, ASHRAE air-side sensible
q_latent   = 0.68 * cfm * delta_gr           # Btu/h, ASHRAE air-side latent (0 when delta_gr = 0, e.g. heating)
q_total    = q_sensible + q_latent
```

**Pinned worked example (winter heating, sensible only).** The post-sealing natural infiltration from the v218 retest,
`cfm = 56.5` (the first-test value), at a winter design difference of 70 deg F (70 indoor over a 0 deg F design day),
heating so no latent term (`delta_gr = 0`): `q_sensible = 1.08 * 56.5 * 70 = 1.08 * 3,955 = 4,271 Btu/h`;
`q_latent = 0.68 * 56.5 * 0 = 0`; `q_total = ` **4,271 Btu/h** -- roughly 4.3 MBH of the heating design load is just the
air the envelope leaks. **Cross-check (summer cooling, sensible + latent).** Same `cfm = 56.5`, a cooling design
difference of 20 deg F (75 indoor under a 95 deg F design day), and a humidity-ratio difference of 30 grains/lb:
`q_sensible = 1.08 * 56.5 * 20 = 1,220 Btu/h`; `q_latent = 0.68 * 56.5 * 30 = 1,153 Btu/h`;
`q_total = 1,220 + 1,153 = ` **2,373 Btu/h**. In cooling, the latent half (the moisture the leaking air drags in) is
nearly as large as the sensible half -- which is exactly why a blower-door number that looks small in heating Btu/h
still drives a real latent load on the cooling side, and why air-sealing pays back on both design days.

## 3. Wiring

A `tools-data.js` row (group `C`, trade `["hvac","weatherization"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the sensible and latent air-side relations, `editionNote` naming the ASHRAE Handbook of
Fundamentals air-side equations with the standard-air-constant / infiltration-airflow / component-only / not-a-Manual-J
caveats); `test/fixtures/worked-examples.json` (the heating sensible-only example + the cooling sensible-plus-latent
cross-check); `test/fixtures/compute-map.js` (`infiltration-load` -> `computeInfiltrationLoad` in
`../../calc-hvacservice.js`); `scripts/related-tiles.mjs` (-> `blower-door-ach50` / `manual-j-heating` /
`manual-j-cooling`); `data/search/aliases.json` ("infiltration load", "air leakage load", "sensible load",
"latent load", "1.08 cfm dt", "0.68 cfm grains", "infiltration btu", "natural infiltration heat"); the id appended to
the existing hvacservice renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index;
a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, airflow <= 0, negative humidity-ratio
difference, the zero-latent heating path). Raise the `calc-hvacservice.js` size cap if needed (dated comment).
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the sensible-only and sensible-plus-latent paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the sensible / latent / total stack
wraps on a phone); render-no-nan + a11y sweep, output read to the value (56.5 cfm / 70 dF -> 4,271 Btu/h sensible).

## 5. Roadmap position

Closes the air-tightness and ventilation batch (v218..v220). Consumes the `cfm_nat` from `blower-door-ach50` (v218) and
feeds the infiltration line of the `manual-j-heating` / `manual-j-cooling` load sheets, completing the chain: measure
the leakage (v218), size the ventilation the tightness now requires (v219), and quantify the load that same leakage
drives (v220). An altitude-corrected air-side factor and a duct-leakage-to-unconditioned-space load sub-mode are
deliberate future follow-ons.
