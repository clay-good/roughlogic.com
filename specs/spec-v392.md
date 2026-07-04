# roughlogic.com Specification v392 -- Retainage Withheld and Net Payment (AIA G702/G703) (calc-accounting.js, Group R, 1 New Tile)

> **Status: LANDED (2026-07-03, 0.137.0; proposed 2026-07-03). Third and final tile of the contractor-billing trio (v390 WIP -> v391 change-order markup
> -> v392 retainage). Every progress draw withholds a retention percentage until the job is substantially complete; this
> tile computes the retention held this period, the cumulative amount tied up, and the net payment on the draw.**
> In-scope catalog expansion under the spec-v106 trades-only charter. On the AIA G702/G703 payment application, the owner
> withholds retainage (commonly `5` to `10%`) from each progress payment as security, releasing it at substantial
> completion. The net payment on a draw is `work completed this period * (1 - retainage rate)`, the retention withheld is
> `work completed * retainage rate`, and the cumulative retained is the running sum. Nothing in the catalog tracks retention.
> This adds the retainage tile to the existing **`calc-accounting.js`** module (Group R); no new group, trade, or
> dependency. Inherits spec.md through spec-v391.md.
>
> **The gap, and the evidence for it.** A draw for `$100,000` of work completed this period at `10%` retainage withholds
> `100000*0.10 = $10,000`, so the net payment is `100000 - 10000 = $90,000`. With `$40,000` retained on prior draws the
> cumulative retention becomes `40000 + 10000 = $50,000` -- half of a typical contractor's margin, tied up until the punch
> list clears. No tile does this; a contractor forecasting cash flow across a job had no retention running total.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The work completed this
period and the prior retained amount are currency (USD); the retainage rate is dimensionless (percent); the retention
withheld, cumulative retention, and net payment are currency. The v18/v21 contract: any non-finite input, or a negative work
amount, negative prior retention, or a retainage rate outside `0 to 100%`, returns `{ error }`; the tile returns the
retention withheld this draw, the cumulative retention, and the net payment, and reports the effective release due if the
rate is stepped down (e.g. reduced to `5%` at 50% completion). Citation discipline (v19/v22): `GOVERNANCE.general` over
construction retainage by name; `editionNote` names **the AIA G702/G703 payment-application practice, retention withheld
`= work completed * retainage rate`, net payment `= work completed * (1 - retainage rate)`, cumulative retention as the
running sum, and typical `5` to `10%` rates released at substantial completion**, and states that **this returns the
retention and net-payment figures for one draw, that the rate and any step-down or stored-materials treatment are contract
and state-law terms, and that it is a cash-flow aid, not a substitute for the payment application or lien-law compliance**.

## 2. The tile

### 2.1 `retainage-tracker` -- Retainage Withheld and Net Payment (AIA G702/G703)

```
inputs:
  work_this_period_usd   USD   work completed and stored this period
  retainage_pct          %     retainage rate (default 10)
  prior_retained_usd     USD   retention withheld on prior draws

retention_this = work_this_period_usd * (retainage_pct / 100)
net_payment    = work_this_period_usd - retention_this
cumulative_ret = prior_retained_usd + retention_this
```

**Pinned worked example ($100,000 this period, 10% retainage, $40,000 prior).** `retention this draw = $10,000`;
`net payment = 100000 - 10000 = $90,000`; `cumulative retention = 40000 + 10000 = $50,000`. **Cross-check (a 5% job).** At
`5%` the same draw withholds `$5,000` and pays `$95,000` net -- the reason a contractor pushes for the lower rate. A
retainage rate outside `0 to 100%`, or a negative amount, takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `R`, trades `["accounting", "small-business", "construction"]`, beside `wip-percent-complete`);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, AIA G702/G703 retainage, `editionNote` naming
the retention, net-payment, and cumulative relations and the typical rates); `test/fixtures/worked-examples.json` (the 10%
example + the 5% cross-check); `test/fixtures/compute-map.js` (`retainage-tracker` -> `computeRetainageTracker` in
`../../calc-accounting.js`); `scripts/related-tiles.mjs` (-> `wip-percent-complete` / `change-order-markup` / `breakeven` /
`labor-burden-rate`); `data/search/aliases.json` ("retainage", "retention", "retainage tracker", "G702 G703", "net payment
draw", "construction retention", "withheld retainage", "progress payment retention", "retainage release"); the id appended
to the existing accounting renderers block in `app.js`; the `// dims:` annotation (currency amounts, rate dimensionless);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the rate bounds, and the
negative / non-finite error seams. No new module; re-pin `calc-accounting.js` on the `check:module-sizes` allowlist, and
bump the `calc-accounting.test.js` `ACCOUNTING_RENDERERS` exact-count assertion. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the `ACCOUNTING_RENDERERS` count bump, the error paths); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the retention / net / cumulative wraps on
a phone); render-no-nan + a11y sweep, output read to the value ($100,000 / 10% / $40,000 -> $10,000, $90,000, $50,000).

## 5. Roadmap position

Closes the contractor-billing trio: v390 recognizes revenue, v391 prices the changes, and v392 tracks the retention held
back from the billings. A retainage-release schedule (stepped reduction and final release at substantial completion) and a
stored-materials line are the deliberate next follow-ons.
