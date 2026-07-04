# roughlogic.com Specification v446 -- Prevailing-Wage Package: Cash vs Bona-Fide Fringe (calc-accounting.js, Group R, 1 New Tile)

> **Status: LANDED (2026-07-04). Third and final tile of the contractor-cost trio (v444 surety bond premium ->
> v445 workers-comp EMR -> v446 prevailing-wage fringe). Davis-Bacon and state prevailing-wage jobs require a base wage plus
> a fringe, and how the fringe is paid changes the employer's cost -- a difference this tile makes explicit and no tile
> computes.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A prevailing-wage determination sets a total hourly
> package of a base cash wage plus a fringe rate. The fringe can be paid as cash (added to the paycheck, so it is subject to
> payroll taxes) or funded through a bona-fide benefit plan (not wages, so no payroll tax). The employer saves the payroll
> tax on the fringe by using a plan: `savings = fringe * payroll_tax_rate`. `employer-payroll-tax` and `labor-burden-rate`
> do not model the base-plus-fringe split. This adds the prevailing-wage tile to the existing **`calc-accounting.js`** module
> (Group R); no new group, trade, or dependency. Inherits spec.md through spec-v445.md.
>
> **The gap, and the evidence for it.** A determination of `$35/hr` base plus `$15/hr` fringe is a `$50/hr` package. Paid all
> cash, the employer owes payroll tax on the whole `$50`; funding the `$15` fringe through a bona-fide plan removes it from
> wages, saving `15 * 0.0765 = $1.15/hr` in FICA alone (more with FUTA/SUTA and workers-comp on wages). Over a `2,000`-hour
> crew-year per worker that is `$2,300`. No tile does this; the fringe-delivery decision had no cost number.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The base wage, fringe, and
package are rates (USD/hr); the payroll-tax rate is dimensionless; the savings is a rate (USD/hr). The v18/v21 contract: any
non-finite input, or a negative wage, fringe, or tax rate, returns `{ error }`; the tile reports the total package, the
cash-fringe employer cost (payroll tax on base plus fringe), the bona-fide-plan employer cost (payroll tax on base only),
and the difference. Citation discipline (v19/v22): `GOVERNANCE.general` over prevailing-wage fringe delivery by name;
`editionNote` names **the Davis-Bacon Act (40 USC 3141) / state prevailing-wage total package (base cash wage plus fringe),
the cash-in-lieu treatment (fringe paid as wages, subject to payroll taxes) versus a bona-fide fringe-benefit plan (not
subject to payroll taxes), and the payroll-tax savings `= fringe * payroll_tax_rate`**, and states that **this returns the
package and the cash-vs-plan employer cost difference, that the payroll-tax rate should include the employer FICA/FUTA/SUTA
and any wage-based workers-comp, that a plan must be bona-fide, and that it is a planning aid, not a substitute for the wage
determination or a benefits/legal advisor**.

## 2. The tile

### 2.1 `prevailing-wage-fringe` -- Prevailing-Wage Package: Cash vs Bona-Fide Fringe

```
inputs:
  base_wage_hr    USD/hr   base hourly cash wage
  fringe_hr       USD/hr   fringe rate from the determination
  payroll_tax     %        employer payroll-tax rate on wages (FICA + FUTA/SUTA + ...)

package      = base_wage_hr + fringe_hr
cash_cost    = package + package * payroll_tax/100          (fringe is taxable wages)
plan_cost    = package + base_wage_hr * payroll_tax/100      (fringe via plan, not wages)
savings_hr   = fringe_hr * payroll_tax/100
```

**Pinned worked example ($35 base, $15 fringe, 7.65% payroll tax).** package `$50/hr`; funding the fringe through a bona-fide
plan saves `15 * 0.0765 = $1.15/hr` versus paying it as cash. **Cross-check (a fuller burden).** At a `15%` combined
payroll-tax-plus-wage-based-comp rate, the plan saving grows to `15 * 0.15 = $2.25/hr` -- the richer the wage-based burden,
the more a fringe plan is worth. A negative wage, fringe, or rate takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting", "small-business", "construction"]`, beside `employer-payroll-tax` /
`labor-burden-rate`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, Davis-Bacon prevailing
wage, `editionNote` naming the package, the cash-vs-plan treatment, and the savings relation);
`test/fixtures/worked-examples.json` (the 7.65% example + the 15% cross-check); `test/fixtures/compute-map.js`
(`prevailing-wage-fringe` -> `computePrevailingWageFringe` in `../../calc-accounting.js`); `scripts/related-tiles.mjs` (->
`employer-payroll-tax` / `labor-burden-rate` / `workers-comp-emr-premium` / `surety-bond-premium`);
`data/search/aliases.json` ("prevailing wage", "davis bacon", "fringe benefits", "cash in lieu fringe", "bona fide plan",
"prevailing wage fringe", "wage determination", "certified payroll fringe", "fringe cash vs plan"); the id appended to the
existing accounting renderers block in `app.js`; the `// dims:` annotation (wages/fringe/package rates, tax dimensionless);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the savings, and the negative /
non-finite error seams. No new module; re-pin `calc-accounting.js` on the `check:module-sizes` allowlist, and bump the
`calc-accounting.test.js` `ACCOUNTING_RENDERERS` exact-count assertion. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the `ACCOUNTING_RENDERERS` count bump, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the package / cash / plan / savings set
wraps on a phone); render-no-nan + a11y sweep, output read to the value ($35 + $15, 7.65% -> $50 package, $1.15/hr saving).

## 5. Roadmap position

Closes the contractor-cost trio: v444 the bond, v445 the workers-comp, and v446 the prevailing wage. A certified-payroll
fringe-credit worksheet and a multi-classification blended-rate tile are the deliberate next follow-ons.
