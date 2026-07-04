# roughlogic.com Specification v441 -- ERV Total Enthalpy Recovery (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-03). First tile of an HVAC energy-recovery trio (v441 ERV total enthalpy -> v442 radiant floor
> output -> v443 economizer enthalpy changeover). `erv-sensible-recovery` recovers only the temperature (sensible) energy; a
> true enthalpy wheel or membrane ERV also moves moisture, and this tile computes that total recovery from the enthalpy
> difference.**
> In-scope catalog expansion under the spec-v106 trades-only charter. An energy recovery ventilator transfers total heat
> (sensible plus latent) between the exhaust and outdoor airstreams. With an enthalpy effectiveness `epsilon`, the recovered
> load is `Q_total = 4.5 * CFM * epsilon * (h_outdoor - h_return)` and the pre-conditioned supply enthalpy is
> `h_supply = h_outdoor - epsilon * (h_outdoor - h_return)`, using the moist-air enthalpies from `moist-air-enthalpy`.
> `erv-sensible-recovery` is sensible-only; the latent half was missing. This adds the total-enthalpy tile to the existing
> **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through spec-v440.md.
>
> **The gap, and the evidence for it.** At `1000 CFM` with a `75%` enthalpy effectiveness, outdoor air at `38 Btu/lb`
> (hot and humid) and return at `28 Btu/lb`, the ERV recovers `Q = 4.5 * 1000 * 0.75 * (38 - 28) = 33,750 Btu/hr` and
> pre-cools the supply to `h = 38 - 0.75*10 = 30.5 Btu/lb` before the coil ever sees it. A sensible-only recovery at the same
> conditions would miss the moisture the enthalpy wheel also removes. No tile does this; the catalog recovered temperature
> but not total heat.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The airflow is a volumetric
flow (CFM); the enthalpy effectiveness is dimensionless; the enthalpies are specific energies (Btu per lb dry air); the
recovered load is a power (Btu/hr). The v18/v21 contract: any non-finite input, or a non-positive CFM, or an effectiveness
outside `(0, 1]`, returns `{ error }`; the recovered load is signed (it is a cooling recovery when outdoor enthalpy exceeds
return, a heating recovery when it is lower), and the tile reports the recovered load and the supply enthalpy. Citation
discipline (v19/v22): `GOVERNANCE.general` over the ERV total energy recovery by name; `editionNote` names **the AHRI 1060 /
ASHRAE total energy recovery relation `Q_total = 4.5 * CFM * epsilon * (h_outdoor - h_return)`, the recovered supply enthalpy
`h_supply = h_outdoor - epsilon*(h_outdoor - h_return)`, the `4.5` sea-level mass-flow factor, and the moist-air enthalpies
from `moist-air-enthalpy`**, and states that **this returns the total (sensible plus latent) recovery and the pre-conditioned
supply enthalpy, that it uses one enthalpy effectiveness (real wheels have separate sensible/latent values), and that it is
a design aid, not a substitute for the ERV performance ratings**.

## 2. The tile

### 2.1 `erv-total-enthalpy-recovery` -- ERV Total Enthalpy Recovery

```
inputs:
  cfm            cfm      ventilation airflow through the ERV
  effectiveness  -        enthalpy (total energy) effectiveness
  h_outdoor      Btu/lb   outdoor-air enthalpy (from moist-air-enthalpy)
  h_return       Btu/lb   return/exhaust-air enthalpy

q_total  = 4.5 * cfm * effectiveness * (h_outdoor - h_return)     Btu/hr
h_supply = h_outdoor - effectiveness * (h_outdoor - h_return)     Btu/lb
```

**Pinned worked example (1000 CFM, 0.75, 38 -> 28 Btu/lb).** `Q = 4.5*1000*0.75*(38-28) = 33,750 Btu/hr` recovered;
`h_supply = 38 - 0.75*10 = 30.5 Btu/lb`. **Cross-check (winter heating recovery).** Outdoor `12 Btu/lb`, return `28 Btu/lb`:
`Q = 4.5*1000*0.75*(12-28) = -54,000 Btu/hr` (a heating recovery, warming the incoming air). A non-positive CFM or an
out-of-range effectiveness takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `erv-sensible-recovery` / `moist-air-enthalpy`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, AHRI 1060 total energy recovery, `editionNote` naming the
recovery and supply-enthalpy relations and the enthalpy source); `test/fixtures/worked-examples.json` (the cooling example +
the heating cross-check); `test/fixtures/compute-map.js` (`erv-total-enthalpy-recovery` ->
`computeErvTotalEnthalpyRecovery` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `erv-sensible-recovery` /
`moist-air-enthalpy` / `cooling-coil-total-load` / `economizer-enthalpy-changeover`); `data/search/aliases.json` ("erv total
recovery", "enthalpy recovery", "erv latent", "energy recovery ventilator", "total energy recovery", "erv effectiveness",
"enthalpy wheel", "erv btu", "latent recovery ventilation"); the id appended to the existing HVAC renderers block in
`app.js`; the `// dims:` annotation (CFM flow, effectiveness dimensionless, enthalpies energy/mass, load power); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the signed recovery, and the non-positive /
out-of-range / non-finite error seams. No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the signed recovery, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the recovered / supply-enthalpy output wraps on a
phone); render-no-nan + a11y sweep, output read to the value (1000 CFM, 0.75, 38->28 -> 33,750 Btu/hr).

## 5. Roadmap position

Opens the HVAC energy-recovery trio: `radiant-floor-output` (v442) and `economizer-enthalpy-changeover` (v443) continue the
energy theme, the latter comparing the same moist-air enthalpies this tile recovers. A separate-sensible-and-latent-
effectiveness mode is the deliberate next follow-on.
