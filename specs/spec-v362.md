# roughlogic.com Specification v362 -- Fully-Burdened Labor Rate (calc-accounting.js, Group R, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v362..v364 (the contractor-business trio -- the true-cost
> numbers a trade estimator bids from: the fully-burdened labor rate (this spec), the equipment owning-and-operating hourly
> rate (v363), and the overhead recovery rate per billable hour (v364).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `employer-payroll-tax` computes the tax portion of
> labor cost, but a contractor's true labor rate adds workers' comp, general liability, benefits, and the unproductive time
> a worker is paid for but not billed -- the fully-burdened rate a job is estimated at. The catalog stops at payroll tax.
> Adds one tile to the existing **`calc-accounting.js`** module (Group R); no new group, trade, or dependency. Inherits
> spec.md through spec-v361.md.
>
> **The gap, and the evidence for it.** The burdened labor cost is the base wage plus every labor-driven cost, optionally
> spread over the productive (billable) fraction of paid time: `burdened = (wage + payroll_tax + workers_comp + liability +
> benefits) / productivity`. For a `$25/hr` worker with 9.15% payroll tax, 8% workers' comp, 2% liability (all on wage),
> and `$4/hr` of benefits, the burden is `$2.29 + $2.00 + $0.50 + $4.00 = $8.79`, a burdened `$33.79/hr` (a 35% burden);
> spread over 85% productive time, the true cost to have that worker on a job is `33.79/0.85 = $39.75/hr` -- the rate an
> estimate must recover, and one a base-wage bid loses money on. `employer-payroll-tax` gives one component; this tile
> assembles the whole burden.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The base wage, the per-hour
burden components, and the burdened rate are currency per hour; the percentage-based components (payroll tax, workers' comp,
liability) are dimensionless percentages of wage; the productivity/billable fraction is a dimensionless percentage; the
burden percent is dimensionless. The v18/v21 contract: any non-finite input, a wage at or below zero, or a productivity
outside `0 < p <= 1` returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the labor-burden buildup
by name; `editionNote` names **the burdened rate `(wage + payroll_tax + workers_comp + liability + benefits)/productivity`,
the payroll-tax components (FICA 7.65%, FUTA/SUTA) from `employer-payroll-tax`, the workers'-comp rate as dollars per $100
of payroll (trade-and-state specific), and the productive-hours adjustment for paid non-billable time**, and states that
**this returns the fully-burdened labor rate and burden percent -- it uses the entered component rates (workers' comp and
liability vary by trade, state, and experience mod; get them from the policy), the productivity fraction accounts for
holidays/PTO/travel/rework a worker is paid for but not billed, and it does not add overhead or profit (`overhead-recovery-
rate`, `markup`); and this is an estimating aid** -- the actual payroll, insurance, and benefit costs govern.

## 2. The tile

### 2.1 `labor-burden-rate` -- Fully-Burdened Labor Rate

```
inputs:
  wage        $/hr   base hourly wage
  payroll_pct %      payroll tax (FICA + FUTA/SUTA), % of wage (default 9.15)
  wc_pct      %      workers' comp, % of wage
  liab_pct    %      general liability, % of wage
  benefits    $/hr   benefits (health, retirement) per hour
  productivity %     billable fraction of paid hours (default 100)

burden = wage*(payroll_pct + wc_pct + liab_pct)/100 + benefits
burdened = (wage + burden) / (productivity/100)
burden_pct = (burdened - wage)/wage * 100
```

**Pinned worked example ($25/hr, 9.15% payroll, 8% WC, 2% liability, $4 benefits, 85% productive).**
`burden = 25 x (9.15 + 8 + 2)/100 + 4 = 25 x 0.1915 + 4 = 4.79 + 4 = 8.79`; burdened at 100% productive `= 33.79/hr`
(35.2% burden); adjusted for 85% billable time, `= 33.79/0.85 = 39.75/hr`. **Cross-check (a low-risk trade, WC 4%, full
productivity).** `burden = 25 x (9.15 + 4 + 2)/100 + 4 = 3.79 + 4 = 7.79`; burdened `= 32.79/hr` (31% burden) -- the
lower workers'-comp class drops the rate a dollar, the reason WC classification matters to a bid. The non-finite,
non-positive, and out-of-range-productivity error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting","small-business","construction"]`, matching `employer-payroll-tax`);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the burden buildup, `editionNote` naming the
burdened-rate formula, the payroll-tax and WC components, the productivity adjustment, and the enter-rates, no-overhead
caveats); `test/fixtures/worked-examples.json` (the 85%-productive example + the low-WC cross-check);
`test/fixtures/compute-map.js` (`labor-burden-rate` -> `computeLaborBurdenRate` in `../../calc-accounting.js`);
`scripts/related-tiles.mjs` (-> `employer-payroll-tax` / `equipment-hourly-rate` / `overhead-recovery-rate` /
`time-and-materials`); `data/search/aliases.json` ("labor burden", "burdened labor rate", "fully loaded labor cost",
"labor burden rate", "true labor cost", "workers comp burden", "billable rate labor", "productive hours cost", "labor
markup"); the id appended to the existing accounting renderers block in `app.js`; the `// dims:` annotation (rates
currency/hour, percentages dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the component buildup, the productivity division, and the non-positive / out-of-range / non-finite error
seams. No new module; re-pin `calc-accounting.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the burden and productivity assertions); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the burden / burdened / burden%
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value ($25/hr, 85% -> $39.75/hr).

## 5. Roadmap position

Opens the contractor-business batch (v362..v364) in `calc-accounting.js`, assembling the full labor burden the payroll-tax
tile only started. The equipment hourly rate (v363) and overhead recovery (v364) follow. A trade/state workers'-comp class
lookup, an experience-modification-rate factor, and a chain into `time-and-materials` and `markup` for a complete bid rate
are the deliberate next follow-ons once the trio lands.
