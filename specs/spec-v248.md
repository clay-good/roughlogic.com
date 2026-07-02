# roughlogic.com Specification v248 -- Fire Pump Rated / Churn / Overload Curve Check (NFPA 20) (calc-firesprinkler.js, Group F, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.93.0; was PROPOSED 2026-07-01). Batch spec-v248..v250 (the fire-sprinkler system-design trio -- the three numbers a
> sprinkler fitter or fire-protection designer sets before a single head goes up: the pump that has to feed the system,
> the water demand and stored supply that pump must sustain, and the head layout that puts the density on the floor. This
> spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: checking a fire pump against its rated curve is the
> acceptance-test math for the machine that feeds every sprinkler and standpipe system. Adds one tile to a new
> **`calc-firesprinkler.js`** module (Group F, trade `["fire"]`), a sibling split off from `calc-fire.js` exactly as
> `calc-rescue.js` was (the fire module already sits near its size cap); no new group, trade, or dependency. Inherits
> spec.md through spec-v247.md.
>
> **The gap, and the evidence for it.** The catalog carries deep fire-*service* hydraulics -- pump discharge pressure
> (`pdp`), hydrant flow (`hydrant-flow`), standpipe pressure (`standpipe-pdp`), needed fire flow (`iso-nff`) -- and the
> sprinkler *discharge* side (`sprinkler-density`, `sprinkler-k-factor`), but nothing that checks a stationary fire pump
> against the three-point envelope NFPA 20 requires. A listed centrifugal fire pump must not shut off (churn) at more than
> 140% of its rated total pressure, and it must still deliver at least 65% of rated pressure at 150% of rated flow. Those
> two limits are what an authority having jurisdiction reads off the field acceptance-test curve, and they are what tells
> a designer whether the churn pressure will overpressure the system piping (driving a pressure-relief-valve requirement)
> and whether the pump has the overload capacity for the calculated sprinkler demand. A 500 gpm at 100 psi pump has to
> hold below 140 psi at churn and above 65 psi at 750 gpm -- three numbers the catalog cannot currently produce.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The rated flow and the
150%-overload flow are volumetric flows (gpm); the rated, churn, and overload pressures and their two limits are pressures
(psi); the pass/fail flags are booleans and the two margins are `dimensionless` ratios. The v18/v21 contract: any
non-finite input, a non-positive rated flow or rated pressure, or a negative measured churn / overload pressure, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the pump-curve relations by name; `editionNote`
names **NFPA 20 (Standard for the Installation of Stationary Pumps for Fire Protection), 2022** (churn ceiling `= 1.40 x
rated_psi`, overload flow `= 1.50 x rated_gpm`, overload floor `= 0.65 x rated_psi`), and states that **the churn and
150%-flow points come from the field acceptance test with a calibrated flow-measuring device, a churn pressure that would
push the system above its component rating requires a listed pressure-relief valve (NFPA 20 does not by itself waive that
requirement), the rated point and net pressure must still meet the system demand computed separately (see v249), and this
is a design and acceptance-check aid, not a stamped fire-pump submittal** -- a qualified fire-protection engineer and the
AHJ govern.

## 2. The tile

### 2.1 `fire-pump-curve` -- Fire Pump Rated / Churn / Overload Curve Check

```
inputs:
  rated_gpm      gpm    pump rated flow, gpm
  rated_psi      psi    pump rated net pressure, psi
  churn_psi      psi    measured shutoff (churn / no-flow) pressure, psi (optional; 0 = not entered)
  overload_psi   psi    measured net pressure at 150% of rated flow, psi (optional; 0 = not entered)

churn_limit_psi   = 1.40 * rated_psi
overload_flow_gpm = 1.50 * rated_gpm
overload_min_psi  = 0.65 * rated_psi
churn_ok    = churn_psi > 0 ? churn_psi <= churn_limit_psi : null
overload_ok = overload_psi > 0 ? overload_psi >= overload_min_psi : null
churn_margin_pct    = churn_psi > 0 ? (churn_limit_psi - churn_psi) / rated_psi * 100 : null
overload_margin_pct = overload_psi > 0 ? (overload_psi - overload_min_psi) / rated_psi * 100 : null
```

**Pinned worked example (500 gpm at 100 psi pump).** A listed pump rated 500 gpm at 100 psi net, field-tested at 128 psi
churn and 72 psi at 750 gpm: `churn_limit = 1.40 x 100 = 140 psi`, and 128 psi is under it, so **churn passes** with a
12 psi (12% of rated) margin; `overload_flow = 1.50 x 500 = 750 gpm`, `overload_min = 0.65 x 100 = 65 psi`, and 72 psi
clears it, so **overload passes** by 7 psi (7% of rated). The pump sits inside the NFPA 20 envelope on both ends.
**Cross-check (a flat, high-shutoff pump).** The same rated point but a churn of 148 psi: `churn_limit` is still 140 psi,
so churn *fails* by 8 psi -- the shutoff head would drive the system above its rating and a listed pressure-relief valve
is required. Same rated point, but only 60 psi measured at 750 gpm: `overload_min` is 65 psi, so overload *fails* -- the
pump lacks the reserve to carry the calculated sprinkler demand at high flow. The two ends of the curve fail for opposite
reasons, which is why NFPA 20 pins both.

## 3. Wiring

A `tools-data.js` row (group `F`, trade `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, the pump-curve relations, `editionNote` naming NFPA 20 2022 with the churn / overload limits and
the relief-valve / acceptance-test / demand-separate / not-a-submittal caveats); `test/fixtures/worked-examples.json`
(the 500 gpm pass example + the flat-curve churn-fail and low-overload-fail cross-checks);
`test/fixtures/compute-map.js` (`fire-pump-curve` -> `computeFirePumpCurve` in `../../calc-firesprinkler.js`);
`scripts/related-tiles.mjs` (-> `pdp` / `standpipe-pdp` / `sprinkler-system-demand`); `data/search/aliases.json`
("fire pump", "churn pressure", "shutoff head", "150 percent point", "overload point", "pump curve", "NFPA 20",
"fire pump test"); a new `declare("./calc-firesprinkler.js", "FIRESPRINKLER_RENDERERS", ["fire-pump-curve"])` block in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example and the error seams (non-finite, rated flow / rated pressure <= 0, negative measured pressures) plus the
null-flag path when churn / overload are left blank. Add the new module to the size-cap allowlist and the
`REFERENCE_RENDERERS`-style module-count test. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**, new-module
size cap, module-count test); `npm test` (+3 fixtures, the new fuzzer block, the non-positive-input error paths, the
optional-input null flags); `npm run build` (one new shell + one new lazy module, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the churn-limit / overload-flow / overload-min /
pass-fail stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (500 gpm at 100 psi -> churn
limit 140 psi, overload 750 gpm at 65 psi, both pass).

## 5. Roadmap position

Opens the fire-sprinkler system-design batch (v248..v250) and stands up the new `calc-firesprinkler.js` module. Feeds
`sprinkler-system-demand` (v249), which sizes the flow and stored volume this pump must sustain, and sits beside the
existing fire-service pump math (`pdp`, `standpipe-pdp`). A fire-pump brake-horsepower / driver-sizing tile and a
pressure-relief-valve sizing tile are deliberate future follow-ons.
