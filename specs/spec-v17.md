# roughlogic.com Specification v17 — Allied-Profession Deepening, Part III of III

> **Implementation status: CLOSED (opened 2026-06-05 after the v16 close;
> closed 2026-06-08).** v17 is the third of three sibling specs (v15,
> v16, v17) that together add new tiles to the catalog. v17 deepens the
> allied professions introduced in v12 (Groups U Veterinary, V EMS, W
> Aviation, X Real Estate, Y Educators) and the v5 trio (R Accounting,
> S Legal, T Lab) and the v9 agriculture group (L). No new groups, no
> new third-party dependencies, no new licenses, no new storage keys,
> no telemetry, no AI. Every constraint from spec.md through spec-v16.md
> continues unchanged.
>
> **How v17 closed (2026-06-08).** Every genuinely-new v17 tile and
> tile-output the first-principles / extension discipline can deliver has
> shipped across the batches recorded below — the Group L agriculture set
> (L.1–L.5), the §Z.4 statistical special functions and the Educators
> statistics tiles that consume them (Y.2 / Y.3 / Y.4), the Group U / V /
> W / X finance / clinical / aviation tiles, and the R.3 / S.1 no-shard
> finance / legal tiles — each with full v14 discipline. As in v15 and
> v16, the audit found that much of what v17 drafts already lives in the
> catalog and is documented as covered rather than duplicated (Aviation
> `top-of-descent` / `weight-balance` / `pressure-altitude` / Mach-in-
> `true-airspeed`; EMS `anion-gap` / `nihss` / `wells-pe` / `perc-rule`;
> Lab `henderson-hasselbalch` / `molarity-dilution` / `beer-lambert`; and
> the R.1 / R.2 / R.4 / S.2 / S.3 finance-tax-legal tiles). The catalog
> stood at **437** when the genuinely-new v17 surface completed.
>
> **The §Z.5 state-keyed shard work is the one drafted surface that does
> not close inside v17, and the close documents why** (the spec-v16 C.2 /
> B.7 "deferred external-dataset" precedent). Of the five drafted shards,
> two already exist and are wired: the R.4 SE wage base is
> [data/accounting/se-tax-parameters.json](../data/accounting/se-tax-parameters.json)
> (by-year SS wage base + Additional-Medicare thresholds) and the sales /
> use rate reference is [data/crosswalks/state-tax-rates.json](../data/crosswalks/state-tax-rates.json).
> The L.1 ET reference is satisfied by the tile's user-supplied reference
> ET0 (CIMIS / Mesonet / NOAA station value) plus the inline FAO 56 Table
> 12 Kc values, exactly as the landed `irrigation-requirement` tile ships.
> The remaining two — a 50-state garnishment-maxima shard (S.1) and a
> 50-state prejudgment-interest-rate shard (S.3) — are genuinely-new,
> jurisdiction-by-jurisdiction **legal** datasets whose every row carries
> real-world consequence and a per-state freshness cadence; per the v16
> precedent for safety-sensitive external datasets they land as their own
> reviewed change, not bundled here. Both tiles already function today on
> a user-supplied / federal-floor basis (`wage-garnishment` computes the
> federal CCPA Title III cap with an optional stricter state-cap percent;
> `judgment-interest` accepts the statutory rate as an input). No tile is
> blocked on the deferred shards.
>
> **The §Z.6 per-group reviewer signoffs remain sought, not obtained.**
> Per the v14 audit-trail convention they do not block v17 from landing in
> main; they gate only the "audited" label on the release announcement.
> The v17 close stanza in [../docs/audit-trail.md](../docs/audit-trail.md)
> records the sought-reviewer roster for Groups U / V / W / X / Y / R / S /
> T / L.
>
> **Version reconciliation.** The spec drafted "package stays 0.16.0 while
> v17 is open and stamps 0.17.0 at the close." That stamp was overtaken by
> events: v18–v23 landed (out of spec order) and stamped the package
> through **0.24.2** before v17's bookkeeping close. Re-stamping 0.17.0
> would be a semver regression, so — exactly as the v18 and v19 closes did
> — the v17 close **rides the current 0.24.2 patch stamp** and changes no
> code (the tile work had already landed under earlier patch stamps; this
> close is documentation only).
>
> **Landed so far (2026-06-05): the first Phase L (Agriculture) batch —
> L.1 irrigation requirement (`irrigation-requirement`), L.3 cattle
> stocking rate (`cattle-stocking-rate`), and L.4 grain bin capacity
> (`grain-bin-capacity`).** These are the pure first-principles
> agriculture tiles that bundle no new reference dataset and do not
> overlap an existing tile (Group L previously held gpa-rate,
> timber-cruise, seed-rate, drawbar-power, irrigation-uniformity,
> bulk-density, crop-yield, thi-livestock, and sprayer-calibration).
> L.1 uses user-supplied reference ET0 plus inline FAO 56 Table 12 Kc
> values (representative mid-season single values, like the C.6 pipe and
> D.5 nameplate-amps inline defaults); no state-keyed ET shard is bundled
> in this batch. **The catalog now stands at 420 tiles** (Group L 9 ->
> 12). Each shipped with the full v14 discipline (dimensional annotation,
> bounds-fuzzer rows, worked-example fixtures cross-checked against FAO
> 56 / USDA NRCS NRPH Ch. 6 / USDA FGIS, a citations.js entry, tile-meta
> + related-tiles + search aliases, and a prerendered shell).
>
> **Landed next (2026-06-05): the §Z.4 statistical special-function
> helpers and the Y.4 Pearson correlation tile.** The §Z.4 deliverable
> adds shared, lazy-loaded numeric implementations of the error function
> and the regularized incomplete gamma / beta functions to
> `pure-math.js` — `erf`, `normCdf`, `gammaln`, `gammainc`, `chi2Cdf`,
> `betainc`, and `tcdf` — each verified against a published table value
> (Abramowitz & Stegun 7.1.26 for `erf`; the standard t and chi-square
> critical-value tables for the CDFs) per the v14 §C.3 discipline. They
> are internal helpers, so they do not touch the home-view payload
> budget. The first tile to consume them is **Y.4 `pearson-correlation`**
> (calc-edu.js): Pearson r and R^2 for paired x / y series, with the
> t-test (`t = r sqrt(n-2) / sqrt(1-r^2)`, n-2 df) and the two-tailed
> p-value from the new `tcdf`. Per OpenIntro Statistics Ch. 8 and
> Numerical Recipes 6.4. **The catalog now stands at 421 tiles** (Group
> Y +1).
>
> **Landed next (2026-06-05): Y.3 chi-square goodness-of-fit
> (`chi-square-gof`), and a stale-SEO fix.** Y.3 consumes the §Z.4
> `chi2Cdf` helper: it computes the chi-square statistic
> `sum((observed - expected)^2 / expected)` on k-1 degrees of freedom,
> the p-value from the chi-square CDF, and a reject / fail-to-reject
> verdict, accepting the expected distribution as either counts or
> proportions (scaled to the observed total) and flagging an expected
> count below 5 (Cochran's rule). Per OpenIntro Statistics Ch. 6.
> Worked example: observed 10/20/30/40 against a uniform expectation ->
> chi-square 20 on 3 df, p ~ 0.00017 (reject the uniform fit).
> **The catalog now stands at 422 tiles** (Group Y +2 over the batch).
> Alongside the tile, the home page's crawler-facing tool count was
> corrected: `index.html` (title, meta description, Open Graph, Twitter
> Card, JSON-LD) read "404" and the SPA's runtime home title/description
> read "400" — both stale and inconsistent. They were updated to a
> durable "420+" that stays accurate as the catalog grows past 420.
>
> **Landed next (2026-06-05): Y.2 linear regression
> (`linear-regression`), completing the Educators statistics set.** Y.2
> reuses the same Sxx / Sxy / Syy sums as Y.4 but reports the predictive
> *line* the correlation tile does not: least-squares slope and
> intercept, R^2, the residual standard error
> (`sqrt(RSS / (n-2))`), the slope t-test (`slope / (RSE / sqrt(Sxx))`,
> two-tailed p from `tcdf`), and an optional prediction `y = intercept +
> slope x`. The slope t-test is identical to Y.4's correlation t-test on
> the same data (verified by a cross-tile test). Per OpenIntro Statistics
> Ch. 8. Worked example: x = 1..5, y = 2,4,5,4,5 -> slope 0.6, intercept
> 2.2, R^2 0.6, RSE 0.894, y(6) = 5.8. **The catalog now stands at 423
> tiles.** With Pearson (Y.4), chi-square (Y.3), and regression (Y.2)
> landed, the Educators statistics surface is complete; Y.1 z-percentile
> remains covered by the existing `bell-curve-zscore`.
>
> **Platform note (home-view payload) — the §H.2 TOOLS extraction LANDED
> (2026-06-05).** Before it, the home-view JS sub-budget (spec-v10 §H.2)
> sat at ~99.3% (~337 B of headroom) and there was no room for another
> tile. The extraction shipped as designed: the catalog registry now
> lives in a lazy-loaded `tools-data.js`, dropping the home-view JS
> sub-budget to **39.9%** (20,025 B / 50,176 B) and the total home payload
> to **31.9%** (32,659 B / 102,400 B) — restoring headroom for the rest of
> v17. The integration suite confirms deep-link routing, Enter-to-route,
> the empty-catalog dropdown, and search all still resolve with the async
> catalog load. The fully-scoped design, worked out and verified against
> the code and now realized, was:
>
> 1. **Move the `TOOLS` array (app.js lines ~458-961, ~30 KB gzipped, the
>    bulk of `app.js`) verbatim into a new `tools-data.js`** that exports
>    it with the identical `{ id, name, group, trades, desc }` text shape
>    so the regex parsers keep matching. `GROUP_NAMES` and `GROUPS` stay
>    inline in `app.js` (small, and used only in interaction paths).
> 2. **Lazy-load it at runtime**, mirroring the existing `ensureAliases`
>    pattern: a module-level `let TOOLS = null` plus `ensureTools()` that
>    dynamic-imports `tools-data.js` once and caches it. The home `#tools`
>    view is static HTML (`applyRoute` only unhides it), so the bare home
>    view needs no TOOLS. `parseHashRoute` consults the id list only for a
>    *tile* hash — empty / `#home` / `#b=` route home without it — so
>    `boot()` routes the home case synchronously and only `ensureTools()`
>    + re-routes when the hash names a tile. `renderToolView` runs after
>    that await. `bindSearch` currently precomputes `nameToId` / `ALL`
>    from TOOLS at bind time; defer those to the first focus / keystroke
>    behind `ensureTools()` (the same place `ensureAliases()` already
>    fires). The browse-by-trade `<select>` ensures TOOLS on first open.
> 3. **Repoint the ~14 build / lint scripts** that `readFile("app.js")`
>    and regex `{ id: ... }` (build-shells, build-tile-index,
>    check-discoverability, check-derivation-coverage, check-shells,
>    check-citation-coverage, check-cross-validation, check-related-tiles,
>    check-tile-meta, check-worked-examples, check-audit-trail, etc.) to
>    read `tools-data.js`. `check-home-payload`'s `HOME_FILES` list keeps
>    measuring `app.js` (now small) and does not add `tools-data.js` —
>    honest precisely because the shard is genuinely deferred, not in the
>    home critical path. Scripts that read `app.js` for *other* content
>    (GROUP_NAMES, the precache `declare` list, citations.test's
>    group-comment splits) keep reading `app.js`.
>
> A static import would shrink `app.js` on disk (what `HOME_FILES`
> measures) without reducing the bytes the browser loads — i.e. it would
> game the gate — so only the lazy form is acceptable. The change is its
> own dedicated commit because it is broad (one new file + async-routing
> surgery + ~14 script repoints) and the integration suite must confirm
> deep-link routing and search still resolve.
>
> **Landed after the extraction (2026-06-05): Group L completed its
> genuinely-new surface — L.2 NPK blend (`npk-blend`) and L.5 pesticide
> tank-mix (`tank-mix`).** `npk-blend` computes the per-nutrient
> recommendation `max(0, crop demand - soil-test credit)` and solves a
> three-straight blend (potash for K, DAP for P, urea for the N balance
> after DAP's N), with over-application flags; crop demand is a
> representative inline default, the certified soil-test recommendation
> governs. `tank-mix` lands only the genuinely-new tank-loading
> accounting (acres per tank, product per tank with unit conversions,
> tanks / total product / carrier water for a field) — the nozzle-output
> GPA calibration is the existing `gpa-rate` tile and the 1/128-acre
> method is `sprayer-calibration`, so L.5 does not duplicate them.
> **The catalog now stands at 425 tiles** (Group L 12 -> 14). Both shipped
> with full v14 discipline.
>
> **Landed next (2026-06-05): the two no-state-shard finance/legal tiles,
> R.3 home-office (`home-office`) and S.1 wage-garnishment
> (`wage-garnishment`).** The Phase R / S audit found the rest already in
> the catalog: R.1 estimated tax is `estimated-tax`, R.2 mileage is
> `mileage-rollup`, R.4 Schedule SE is `se-tax`, S.2 FRCP deadline is
> `court-deadline`, S.3 prejudgment interest is `judgment-interest`. R.3
> reports the simplified ($5/ft^2 to a $1,500 cap) vs actual
> (office-percent-of-expenses) home-office deduction and the higher of
> the two (IRS Pub 587). S.1 computes the federal CCPA Title III
> garnishment cap (consumer 25% / student-loan 15% under the
> 30x-minimum-wage floor; child support 50-65% exempt from the floor),
> with an optional stricter state-cap percent in place of a bundled
> 50-state shard. **The catalog now stands at 427 tiles** (Group R 12 ->
> 13, Group S 9 -> 10). The remaining genuinely-new v17 surface is the
> tiles that genuinely need bundled state-keyed shards (per-state
> estimated-tax brackets, garnishment maxima, prejudgment-interest rates).
>
> **Landed next (2026-06-05): Group V (EMS) completed — V.1
> ideal-body-weight (`ideal-body-weight`) and V.3 corrected-qt
> (`corrected-qt`).** The Phase V audit found V.2 anion gap
> (`anion-gap`), V.4 NIHSS (`nihss`), V.5 Wells (`wells-dvt` /
> `wells-pe`), and V.6 PERC (`perc-rule`) already in the catalog, so
> only V.1 and V.3 were genuinely new. V.1 reports the Devine ideal
> body weight (`50 + 2.3*(height_in - 60)` male, `45.5 + ...` female),
> the Hume lean body weight, and the standard ICU adjusted body weight
> (`IBW + 0.4*(ABW - IBW)`) once actual weight exceeds 130 % of IBW —
> the dosing-weight conventions used for hydrophilic-drug and
> tidal-volume calculations; a short-stature flag fires below 60 in.
> V.3 rate-corrects the measured QT three ways — Bazett
> (`QT/sqrt(RR)`), Fridericia (`QT/cbrt(RR)`), and Framingham
> (`QT + 154*(1 - RR)`), `RR = 60/HR` — and flags that Fridericia is
> preferred outside 60-100 bpm with the 450 / 460 / 500 ms prolongation
> bands. Both carry the spec-v12 §13 EMS limitation banner. Worked
> examples: male 70 in -> IBW 73.0 kg (adjusted 83.8 kg at ABW 100 kg);
> QT 400 ms at HR 75 -> QTcB 447.21 ms. **The catalog now stands at 429
> tiles** (Group V 20 -> 22, EMS deepening complete). The calc-ems.js
> and limitation-banner.js module-size caps were bumped per the
> current-plus-20%-headroom convention to absorb the two tiles.
>
> **Landed next (2026-06-06): the three no-shard Group X (Real Estate)
> financing tiles — X.1 mortgage-point-breakeven
> (`mortgage-point-breakeven`), X.3 per-diem-interest (`per-diem-interest`),
> and X.4 reserves (`mortgage-reserves`).** All three are pure
> first-principles finance with no bundled shard. X.1 prices a discount-
> point buy-down: the monthly payment with and without points (the same
> closed-form amortization the PITI tile uses), the monthly savings, the
> up-front point cost, and the break-even month (`point cost / monthly
> savings`), with a worth-it verdict against the holding period. X.3
> computes the prepaid (odd-days) interest on the CFPB Closing Disclosure:
> `daily = loan x rate / basis` (Actual/365, Actual/360, or 30/360) times
> the days from the closing date through the end of the month. X.4 sizes
> the reserves requirement: `required = PITI x months` against eligible
> liquid assets plus an allowable fraction (default 60 %) of vested
> retirement, returning the surplus or shortfall and the months of PITI
> covered. X.2 rent-vs-buy NPV and X.5 income-method GRM (which overlaps
> the existing `cap-rate-dscr`) remain for a later batch. **The catalog
> now stands at 432 tiles** (Group X 15 -> 18). Each shipped with full
> v14 discipline; the calc-realestate.js module-size cap was bumped per
> the current-plus-20%-headroom convention.
>
> **Landed next (2026-06-07): the three genuinely-new Group U
> (Veterinary) tiles — U.1 CRI drip rate (`vet-cri`), U.3 blood
> transfusion volume (`vet-transfusion`), and U.4 equine body weight
> from heart-girth (`equine-weight`).** All three are pure
> first-principles and carry the spec-v12 "veterinarian governs"
> limitation banner. U.1 is the AVECCT CRI bag method: drug to add
> (`mg/hr x duration`), infusion rate (`bag / duration`), drops/min for
> the selected drip set, and mg/hr delivered, with a dose toggle
> (mcg/kg/min or mg/kg/hr) and an over-bag-volume flag (Plumb's 10th ed.
> / AVECCT). U.3 estimates the transfusion volume `BV x weight x
> (PCV_target - PCV_current) / PCV_donor` (dog 90, cat 60, horse 80
> mL/kg), the suggested rate, and the duration, rejecting a donor PCV
> below 35 and flagging over-transfusion and the 4-hr unit limit (ACVIM
> 2021 consensus). U.4 is the Carroll-Huntington tape estimate
> `girth_in^2 x length_in / 330` (horse) or `/ 299` (pony), with the
> kg conversion and a 1.5-2.5 % hay-feeding band. The Phase U audit
> found the rest already covered or out of the genuinely-new scope: U.2
> anesthesia induction is a formulary range-lookup the existing
> `vet-weight-based-dose` and `vet-anesthesia-vitals` already serve, and
> U.5 caloric-with-illness-factor is the existing `vet-energy-requirement`
> (RER / MER). **The catalog now stands at 435 tiles** (Group U 18 ->
> 21). Each shipped with full v14 discipline; the calc-vet.js
> module-size cap was bumped per the current-plus-20%-headroom convention.
>
> **Landed next (2026-06-08): the two genuinely-new no-shard tiles W.5
> holding-pattern fuel (`holding-fuel`) and X.2 rent-vs-buy NPV
> (`rent-vs-buy`).** Both are pure first-principles with no bundled
> shard. W.5 answers the in-hold endurance question that the existing
> `fuel-planning` (pre-flight trip+reserve) does not: fuel burned over
> the hold (`burn x min/60`), fuel remaining at release, endurance left
> (hr:min), and the maximum hold before busting the regulatory floor
> (`(tank - reserve) / burn`), flagging a reserve bust, an insufficient-
> fuel divert, and an unusual over-60-min hold; weight at 6.0 lb/gal
> avgas / 6.7 lb/gal jet-A, reserve floors per 14 CFR 91.151 / 91.167.
> X.2 is the New York Times rent-vs-buy methodology in first-principles
> form: each path is a present value of out-of-pocket cost discounted at
> the investment-return rate — `PV_buy = down + PV(P&I + tax + insurance
> + HOA + maintenance) - PV(net sale proceeds)` against
> `PV_rent = PV(inflating rent)` — with the break-even holding year and a
> buy-vs-rent verdict; the renter's retained down payment correctly
> carries zero NPV because it is discounted at the same rate it earns.
> Tax treatment (mortgage-interest deduction, the Section 121 exclusion)
> is out of scope and noted. The Phase W audit confirmed W.1-W.4 already
> present (`top-of-descent`, `weight-balance`, `pressure-altitude`,
> Mach-in-`true-airspeed`); the Phase X X.5 income-method GRM stays
> covered by the existing `cap-rate-dscr`. Worked examples: 12 gph / 30-
> min hold / 40 gal -> 6 gal burned, 34 left, 155-min max hold; a
> $400k / $80k-down / 6.5% / 7-yr buy -> PV_buy $158,760 vs PV_rent
> $166,256, buying cheaper, break-even at year 6. **The catalog now
> stands at 437 tiles** (Group W 18 -> 19, Group X 18 -> 19). Each
> shipped with full v14 discipline; the calc-aviation.js and
> calc-realestate.js module-size caps were bumped per the current-plus-
> 20%-headroom convention.
>
> **Landed next (2026-06-09): X.5 income-method valuation, as a net-new
> output extension to the existing `rental-worksheet` tile (not a new
> tile).** The earlier batches recorded X.5 as covered by `cap-rate-dscr`
> for its cap-rate / DSCR core, but the gross-rent-multiplier (GRM) the
> income approach leads with was genuinely absent from the catalog. Per
> the v16 B.3 / C.4 precedent (land a net-new output on the existing tile
> rather than ship a duplicate), `rental-worksheet` now also reports the
> GRM (`property value / annual gross rent`) and the value it implies at
> a user-entered comparable / market GRM (`market GRM x annual gross
> rent`), completing the income approach alongside the worksheet's
> existing NOI / cap-rate / cash-on-cash / expense-ratio outputs. GRM is
> computed on annual scheduled gross rent (the appraisal income-approach
> convention; some markets quote a monthly GRM, so the citation flags the
> basis). No new tile, no new shard, no catalog-count change (still 437);
> the worked-example fixture and bounds/unit rows pin GRM 320000 / 26400
> = 12.121 and value-at-market-GRM 10 x 26400 = 264000. Per the Appraisal
> Institute, The Appraisal of Real Estate (15th ed.). With this, every
> genuinely-new v17 tile and tile-output the first-principles / extension
> discipline can deliver has shipped; the only remaining drafted surface
> is the Z.5 state-keyed shards (per-state estimated-tax brackets,
> garnishment maxima, prejudgment-interest rates), deferred to their own
> reviewed changes.
>
> **Audit note (the same finding the v16 batches surfaced).** Much of
> what v17 drafts already exists in the live catalog and is documented
> as covered rather than duplicated: the Aviation section's W.1
> top-of-descent (`top-of-descent`), W.2 weight and balance
> (`weight-balance`), W.3 pressure altitude (`pressure-altitude`), and
> W.4 Mach (`true-airspeed` returns Mach) are already present; the EMS
> section's V.2 anion gap, V.4 NIHSS (`nihss`), V.5 Wells (`wells-pe`),
> and V.6 PERC (`perc-rule`) are present; the Lab section's T.1
> Henderson-Hasselbalch (`henderson-hasselbalch`), T.2 molarity
> (`molarity-dilution`), and T.3 Beer-Lambert (`beer-lambert`) are
> present. The genuinely-new v17 surface concentrates in Group L
> (this batch and L.2 / L.5), the Educators statistics tiles that need
> the §Z.4 special functions (Y.2 regression, Y.3 chi-square, Y.4
> Pearson), and a subset of the X / R / S finance / tax / legal tiles
> (several of which need the §Z.5 state-keyed shards). v17 remains open
> and these land in later batches. Package version stamps 0.17.0 at the
> close. Catalog total when the trio's genuinely-new set is complete is
> below the drafted 485 because the audit found substantial existing
> coverage.

> Foreword, in the voice of a maintainer who has been told twice
> in the last six months by people who have nothing in common
> with each other that the site "saved their afternoon." Once
> from a paramedic on a 12-hour shift who needed an anion gap
> with the albumin correction at 3:14 AM and got it on a no-
> account, no-paywall, no-popup tile in fourteen seconds. Once
> from a homebuyer's agent who needed a per-diem proration of
> interest at closing on a Friday at 2:55 PM and was trying to
> do it on her phone in a parking lot before the loan officer
> closed at three. Both of them found the site by typing six
> words into a search engine. Neither of them gave the site an
> email address. Neither of them was asked to.
>
> That is the brief. v17 takes it seriously by adding 35 tiles to
> the allied-profession surface the v5 and v12 specs opened. None
> of these tiles are exotic. Each is a number that the
> professional in question reaches for once a week or once a day,
> currently gets behind a paywall or a captcha or a chatbot, and
> can have for free here in two seconds with a citation and a
> source-stamp. The vet tech with a CRI to run for an overnight
> patient. The EMT with a Wells score to compute before calling
> the cath lab. The CFI with a TOD to brief on the descent. The
> realtor with a rent-vs-buy NPV. The high-school stats teacher
> with a Pearson correlation. The bookkeeper with a 1040-ES
> quarterly. The paralegal with a federal-court filing deadline.
> The grad student with a Henderson-Hasselbalch buffer. The
> rancher with an acre-foot ET requirement.
>
> Same rules. No accounts. No telemetry. No AI. No phone-home.
> Just the formula, the citation, the source stamp, and the
> clipboard. Build it the way the rest was built. One tile, one
> derivation, one cross-check, one tolerance, one signoff. Then
> get out of the way.

This document is the v17 spec. It inherits everything from
spec.md, spec-v2.md, spec-v3.md, spec-v4.md, spec-v5.md,
spec-v6.md, spec-v7.md, spec-v8.md, spec-v9.md, spec-v10.md,
spec-v11.md, spec-v12.md, spec-v13.md, spec-v14.md, spec-v15.md,
and spec-v16.md. Every prior constraint remains in force.
Where v17 deepens a v12 group (U / V / W / X / Y) or a v5
group (R / S / T) or a v9 group (L), the v12 and v5 group-
specific disclaimers (veterinary / EMS / aviation / real-
estate / educator / tax / legal / bench-science / agricultural)
apply unchanged.

Repository: github.com/clay-good/roughlogic.com

US standards only.

## 1. Inheritance and conventions

- Per-tile structure (Inputs / Output / Math / Citation / Edge
  cases / Tests) per the v9 / v12 / v15 / v16 pattern.
- v14 dimensional-analysis lint, bounds-and-edge-case fuzzer,
  worked-example registry, and reviewer-signoff requirements
  apply to every new tile.
- Tile IDs within this spec are letter.number scoped to v17: U.1
  through U.5 are the five new veterinary tiles added in v17,
  numbered fresh within this spec.
- Group V (EMS) tiles inherit the spec-v12 §13 medical-screening-
  not-clinical-decision-support carve-out. Every Group V tile in
  v17 carries the v12 disclaimer banner. No tile in v17 advises
  treatment; tiles compute a score or a number the licensed
  provider then interprets.
- Group U (Veterinary) tiles inherit the spec-v12 "veterinarian
  governs" disclaimer.
- Group R (Accounting) tiles inherit the spec-v5 tax-law variant
  notice. Group S (Legal) tiles inherit the spec-v5 legal-
  information variant. Group T (Lab) tiles inherit the spec-v5
  bench-science variant.
- All values requiring a current code, current rate, or current
  publication are user-supplied or state-keyed-shard per spec-v12
  §H. v17 does not bundle paywalled lookups.

## 2. Phase U — Veterinary deepening (Group U)

Five new tiles.

### U.1 Constant-rate infusion (CRI) drip rate

**Inputs.** Drug name (free text), drug stock concentration
(mg/mL), target dose (mcg/kg/min or mg/kg/hr; unit toggle),
patient weight (kg), carrier fluid bag volume (mL), planned
infusion duration (hr) or planned bag-life (hr), IV pump
selector (syringe pump in mL/hr / drip set 60 gtt-mL / 10 gtt-mL).

**Output.** Total drug to add to bag (mg, mL), infusion rate
(mL/hr), drops per minute for the selected drip set, mg per
hour delivered, and a "remaining bag time at this rate" line for
the entered bag volume.

**Math.** Public arithmetic; mg added = dose * weight * time;
mL/hr = bag_volume / duration; gtt/min = mL/hr * gtt_per_mL / 60.

**Citation.** "Per Plumb's Veterinary Drug Handbook 10th ed. and
the AVECCT (Academy of Veterinary Emergency and Critical Care
Technicians) published CRI worksheets. Veterinarian governs.
Free at avecct.org for technician materials."

**Edge cases.** Dose * weight producing volume above bag volume
flagged as needing higher-concentration stock. Drip rate above
500 mL/hr flagged as outside typical gravity-drip range.

**Tests.** Ten unit tests including a 0.5 mcg/kg/min fentanyl CRI
on a 15 kg dog over 24 hr in a 250 mL bag against a published
AVECCT worksheet.

### U.2 Anesthesia drug induction and maintenance

**Inputs.** Species (dog / cat / horse / cattle / small mammal),
patient weight (kg), induction agent (propofol / alfaxalone /
ketamine-diazepam / etomidate), maintenance agent (isoflurane /
sevoflurane / propofol CRI / TIVA), pre-medication included flag.

**Output.** Induction dose (mg total, mL of stock at user-entered
concentration), maintenance rate (mg/kg/hr for TIVA, percent for
inhalant with MAC reference), and a banner directing to current
formulary because dose ranges shift between editions of Plumb's.

**Math.** Dose lookup from public veterinary-anesthesia
references at the user-confirmed-current-edition ranges; the
tile prints the range, the user picks the value, and the tile
multiplies. The MAC values for inhalants are bundled (dog 1.3
isoflurane, cat 1.6, horse 1.3; the values are stable and
published in every veterinary-anesthesia textbook from
Lumb-and-Jones forward).

**Citation.** "Per Lumb and Jones' Veterinary Anesthesia and
Analgesia 5th ed. and Plumb's Veterinary Drug Handbook 10th ed.
MAC values from any recent veterinary-anesthesia textbook.
Veterinarian governs. Free at avma.org for AVMA anesthesia
guidelines TOC."

**Edge cases.** Patient under 1 kg (neonatal) flagged as
specialist-managed. Patient over 800 kg flagged as draft-horse
range; specialist consultation suggested.

**Tests.** Eight unit tests.

### U.3 Blood transfusion volume

**Inputs.** Species (dog / cat / horse), patient weight (kg),
current PCV (%), target PCV (%), donor PCV (%), product (whole
blood / pRBCs / plasma).

**Output.** Required transfusion volume (mL), suggested rate
(mL/kg/hr; default 5 to 10 for whole blood per ACVIM consensus),
total infusion duration (hr), and a banner reminding the user to
cross-match before transfusion and to monitor for transfusion
reaction.

**Math.** Public veterinary formula:

    volume_mL = 90 * weight_kg * (PCV_target - PCV_current) / PCV_donor   // dog
    volume_mL = 60 * weight_kg * (PCV_target - PCV_current) / PCV_donor   // cat

The 90 and 60 are blood-volume-per-kg estimates from veterinary
physiology.

**Citation.** "Per the ACVIM (American College of Veterinary
Internal Medicine) Transfusion Medicine Consensus Statement
(2021). Free at acvim.org for consensus statements TOC."

**Edge cases.** PCV target above 35 percent flagged as over-
transfusion risk. Donor PCV below 35 percent rejected.

**Tests.** Eight unit tests.

### U.4 Equine body weight from heart-girth tape

**Inputs.** Heart girth (in), body length (in; point of shoulder
to point of buttock), pony / horse selector.

**Output.** Estimated body weight (lb, kg) by the Carroll and
Huntington formula, recommended hay feeding rate (1.5 to 2.5
percent of body weight per day), and a feeding-rate banner.

**Math.** Public Carroll and Huntington (1988):

    BW_lb = (girth_in^2 * length_in) / 330   // horse
    BW_lb = (girth_in^2 * length_in) / 299   // pony

**Citation.** "Per Carroll C.L. and Huntington P.J., 'Body
condition scoring and weight estimation of horses' Equine Vet J
20(1) 1988. AAEP body-condition score reference for adjusting
nutrition. Free at aaep.org for AAEP educational materials."

**Edge cases.** Girth below 50 in or above 95 in flagged as
outside the published validation range.

**Tests.** Six unit tests.

### U.5 Caloric needs with illness factor

**Inputs.** Species (dog / cat), patient weight (kg), illness
factor (1.0 critical-care convalescent, 1.0 to 1.4 surgical /
trauma, 1.5 to 2.0 sepsis / burns per AAHA published table),
target macronutrient ratio (default protein 25 percent dog / 35
percent cat).

**Output.** Resting energy requirement (kcal/day), illness-
energy requirement (kcal/day), recommended diet volume per
user-entered diet kcal/cup, and a target-protein-grams-per-day
line.

**Math.** Public:

    RER = 70 * weight_kg^0.75
    IER = RER * illness_factor

**Citation.** "Per AAHA-AAFP Life Stage Guidelines (2010 canine
and 2021 feline). Illness factors per the Plumb's / Veterinary
Information Network published critical-care nutrition table.
Veterinarian governs. Free at aaha.org for guidelines TOC."

**Edge cases.** Illness factor above 2.0 flagged as outside
common ICU range.

**Tests.** Six unit tests.

## 3. Phase V — EMS deepening (Group V)

Six new tiles. Every Group V tile carries the spec-v12 §13
disclaimer banner ("Estimate / score only. This is decision
support, not medical advice. A licensed provider governs care.").

### V.1 Ideal body weight (Devine) and adjusted body weight

**Inputs.** Height (in or cm; unit toggle), sex (male / female),
actual body weight (kg; optional, enables adjusted BW output).

**Output.** Ideal body weight (kg) by Devine, lean body weight
(kg) by Hume, adjusted body weight (kg) for actual > 130 percent
of IBW (standard ICU formula AdjBW = IBW + 0.4 * (ABW - IBW)).

**Math.** Public Devine (1974):

    IBW_male_kg = 50 + 2.3 * (height_in - 60)
    IBW_female_kg = 45.5 + 2.3 * (height_in - 60)

**Citation.** "Devine B.J., 'Gentamicin therapy' Drug Intell Clin
Pharm 8 1974. Hume R., 'Prediction of lean body mass from height
and weight' J Clin Pathol 19(4) 1966. Free at pubmed.ncbi.nlm.nih.gov."

**Edge cases.** Height below 60 in flagged with note that Devine
under-estimates for short stature; alternatives (Robinson, Miller)
listed in the disclosure.

**Tests.** Six unit tests.

### V.2 Anion gap and corrected anion gap

**Inputs.** Sodium (mEq/L), chloride (mEq/L), bicarbonate (mEq/L),
albumin (g/dL; optional).

**Output.** Anion gap (mEq/L), and (if albumin entered) the
albumin-corrected anion gap by the Figge correction (+2.5 mEq/L
per 1 g/dL below 4.0).

**Math.** Public:

    AG = Na - (Cl + HCO3)
    AG_corrected = AG + 2.5 * (4.0 - albumin)

**Citation.** "Per Figge J. et al., 'The role of serum proteins
in acid-base equilibria' J Lab Clin Med 117(6) 1991, and the
Mehta et al. 2015 NEJM review on metabolic acidosis. Free at
pubmed.ncbi.nlm.nih.gov for abstracts."

**Edge cases.** Values outside common ranges (Na 120 to 160, Cl
85 to 120, HCO3 5 to 40) flagged. Albumin below 1.5 or above 6.0
flagged.

**Tests.** Six unit tests.

### V.3 Corrected QT interval (Bazett and Fridericia)

**Inputs.** Measured QT (ms), heart rate (bpm).

**Output.** RR interval (ms), QTc by Bazett, QTc by Fridericia,
QTc by Framingham, and a banner indicating that Fridericia is
preferred for HR outside 60 to 100 (Bazett overcorrects at high
HR and undercorrects at low HR).

**Math.** Public:

    RR_s = 60 / HR
    QTcB = QT / sqrt(RR_s)        // Bazett
    QTcF = QT / RR_s^(1/3)         // Fridericia
    QTcFram = QT + 154 * (1 - RR_s)  // Framingham

**Citation.** "Per Bazett H.C. 'An analysis of the time-relations
of electrocardiograms' Heart 7 1920; Fridericia L.S. 1920;
Sagie A. et al. 'An improved method for adjusting the QT
interval for heart rate (the Framingham Heart Study)' Am J
Cardiol 70(7) 1992. Free at pubmed.ncbi.nlm.nih.gov."

**Edge cases.** HR outside 30 to 220 flagged. QT outside 200 to
700 ms flagged.

**Tests.** Six unit tests.

### V.4 NIH Stroke Scale (NIHSS) scoring

**Inputs.** Eleven NIHSS items, each scored per the standard
form (0 to 4 per item depending on item). The tile renders a
form, not a free-text input.

**Output.** Total NIHSS score (0 to 42), stroke-severity band
(minor 1-4, moderate 5-15, moderate-to-severe 16-20, severe
21-42), and a banner pointing to NIH Stroke Scale training and
to the AHA / ASA guidelines for thrombolytic-eligibility
thresholds.

**Math.** Sum of item scores.

**Citation.** "Per NIH Stroke Scale (NINDS, 1989; updated 2003).
AHA / ASA 2019 guidelines for management of acute ischemic
stroke govern care. Free at stroke.nih.gov for NIHSS training
materials."

**Edge cases.** Untestable items handled per NIHSS scoring rules
(score as 0 with a flag explaining the convention).

**Tests.** Eight unit tests covering each severity band and the
NINDS published practice cases.

### V.5 Wells DVT and PE scoring

**Inputs.** Per-criterion checkboxes for the Wells DVT score (9
items) and the Wells PE score (7 items). Two tabs / forms in one
tile.

**Output.** Total Wells DVT score, DVT-probability band (low /
moderate / high or two-tier likely / unlikely per the user-
selected convention), Wells PE score, PE-probability band, and a
banner naming PERC and YEARS as adjacent rules and pointing to
the v17 V.6 PERC tile.

**Math.** Sum of item points per Wells published.

**Citation.** "Per Wells P.S. et al. 'Value of assessment of
pretest probability of deep-vein thrombosis' Lancet 350(9094)
1997 (DVT) and 'Derivation of a simple clinical model to
categorize patients probability of pulmonary embolism' Thromb
Haemost 83(3) 2000 (PE). Free at pubmed.ncbi.nlm.nih.gov."

**Edge cases.** Patient without clinical assessment available
flagged ("Wells requires bedside assessment; this tile does not
substitute for that").

**Tests.** Ten unit tests covering each item independently and
the published validation-cohort cases.

### V.6 PERC rule pulmonary embolism

**Inputs.** Per-criterion checkboxes for the 8 PERC items (age <
50, HR < 100, SpO2 > 94, no unilateral leg swelling, no
hemoptysis, no recent trauma/surgery, no prior DVT/PE, no
hormone use).

**Output.** PERC negative / PERC positive verdict, recommended
next step per the AAFP / ACEP published flow ("if PERC negative
and Wells low, no further workup; otherwise consider D-dimer or
imaging"), and a banner referencing V.5 Wells.

**Math.** PERC negative = all 8 items negative.

**Citation.** "Per Kline J.A. et al. 'Clinical criteria to
prevent unnecessary diagnostic testing in emergency department
patients with suspected pulmonary embolism' J Thromb Haemost
2(8) 2004. Free at pubmed.ncbi.nlm.nih.gov."

**Edge cases.** Pregnancy or active cancer flagged as
contraindications to PERC ("PERC was validated in low-risk
populations and is not appropriate for this presentation").

**Tests.** Six unit tests.

## 4. Phase W — Aviation deepening (Group W)

Five new tiles.

### W.1 Top of descent (TOD)

**Inputs.** Current altitude (ft), target altitude (ft),
ground speed (knots), desired descent angle (degrees; default
3.0 for a stabilized approach), entered wind (headwind /
tailwind component, knots) if known.

**Output.** Vertical distance to descend (ft), required descent
rate (fpm) at the entered ground speed, distance from target at
which to begin descent (nm), and a sanity-check banner if
descent rate exceeds 1500 fpm (passenger comfort) or 2000 fpm
(structural advisory).

**Math.** Public:

    descent_distance_nm = (alt_diff / 1000) * 3   // 3:1 rule for 3-deg path
    descent_rate_fpm = GS_kts * tan(angle) * 101.27   // approx

**Citation.** "Per FAA Instrument Flying Handbook FAA-H-8083-15B
chapter 7 and the AIM 5-1-13. Free at faa.gov/regulations_policies/handbooks_manuals/aviation/."

**Edge cases.** Ground speed below 60 knots flagged as outside
typical descent range. Descent angle above 6 degrees flagged.

**Tests.** Eight unit tests including a 35,000 ft to 3000 ft
descent at 450 GS.

### W.2 Weight and balance moment-arm sum

**Inputs.** Aircraft empty weight (lb), empty CG arm (in),
station list (each: weight lb, arm in; pilots / passengers /
baggage / fuel-by-tank). The tile renders a form with up to 10
stations.

**Output.** Total weight (lb), total moment (lb-in), CG (in),
forward and aft limits at the entered weight per a piecewise-
linear envelope the user provides (default empty envelope; user
must enter from POH).

**Math.** Public arithmetic; CG = sum(weight * arm) / sum(weight).

**Citation.** "Per FAA Weight and Balance Handbook FAA-H-8083-1B.
POH governs envelope. Free at faa.gov/regulations_policies/handbooks_manuals/aviation/."

**Edge cases.** Total weight above the user-entered gross-weight
limit flagged. CG outside envelope flagged with the offending
limit named.

**Tests.** Eight unit tests including a Cessna 172 worked example
from the POH.

### W.3 Pressure altitude from altimeter setting

**Inputs.** Indicated altitude (ft), altimeter setting (in Hg or
hPa).

**Output.** Pressure altitude (ft), the correction in feet per
0.01 in Hg (about 10 ft per 0.01), and a comparison band against
typical standard-day altimeter (29.92 in Hg).

**Math.** Public:

    pressure_altitude_ft = indicated_altitude + (29.92 - setting) * 1000

**Citation.** "Per FAA Pilot's Handbook of Aeronautical Knowledge
FAA-H-8083-25C chapter 4. Free at faa.gov."

**Edge cases.** Altimeter setting outside 28.0 to 31.0 in Hg
rejected.

**Tests.** Six unit tests.

### W.4 Mach number from TAS and OAT

**Inputs.** True airspeed (knots), outside air temperature (C
or F).

**Output.** Mach number, speed of sound at the entered OAT
(knots), and an indicated-Mach equivalent for the user's
altitude.

**Math.** Public:

    a_kts = 38.967854 * sqrt(T_K)   // speed of sound
    M = TAS_kts / a_kts

**Citation.** "Per FAA Instrument Procedures Handbook FAA-H-8083-16B
appendix and ICAO standard atmosphere. Free at faa.gov."

**Edge cases.** TAS above 600 knots in light aircraft flagged.
OAT outside -90 C to +60 C flagged.

**Tests.** Six unit tests.

### W.5 Holding pattern fuel and time

**Inputs.** Aircraft fuel burn (lb/hr or gph), holding airspeed
(knots), expected holding duration (min), tank quantity (gal or
lb).

**Output.** Fuel required for holding (lb, gal), fuel remaining
after holding (lb, gal), endurance remaining (hr:min), and a
flag if remaining fuel is below the FAR-required reserve (45 min
IFR per 91.167, 30 min day VFR per 91.151).

**Math.** Public arithmetic.

**Citation.** "Per 14 CFR 91.151 (VFR fuel) and 91.167 (IFR
fuel). Free at ecfr.gov."

**Edge cases.** Holding duration above 60 min flagged as
unusual; reroute / alternate normally evaluated first.

**Tests.** Six unit tests.

## 5. Phase X — Real Estate deepening (Group X)

Five new tiles.

### X.1 Mortgage point break-even

**Inputs.** Loan amount, base rate (percent), rate with points
(percent), point cost (percent of loan; typically 1 percent per
point), expected holding period (years).

**Output.** Monthly payment at base rate, monthly payment with
points, monthly savings, total point cost, months-to-break-even,
and a verdict (worth-it vs not based on the user's holding
period).

**Math.** Public amortization formula (v12 X.1 and X.2 engines).
Break-even months = point_cost_dollars / monthly_savings.

**Citation.** "First-principles amortization. Per CFPB Loan
Estimate disclosures (12 CFR 1026.37). Free at consumerfinance.gov."

**Edge cases.** Rate-with-points equal to or above base rate
rejected. Holding period above 30 years flagged.

**Tests.** Six unit tests.

### X.2 Rent vs buy NPV comparison

**Inputs.** Purchase price, down payment, mortgage rate, term
(years), property tax (annual percent or dollar), insurance
(annual dollar), HOA (monthly), maintenance (annual percent),
appreciation rate (annual percent; default 3 percent), rent
(monthly), rent inflation (annual percent; default 3 percent),
investment return on saved down-payment (annual percent;
default 5 percent), holding period (years), capital-gains
treatment (Section 121 exclusion eligible flag, see v12 X.7).

**Output.** NPV of buying (dollars), NPV of renting (dollars),
the difference, the break-even holding period if any, and a
sensitivity-band overlay (NPV at +/- 1 percent rate, +/- 1
percent appreciation).

**Math.** Discounted-cash-flow over the holding period using all
inputs. The math is public; the tile reuses the v12 X.2
amortization engine for the mortgage cash flows and the v8 D.1
optional cost output for sensitivity.

**Citation.** "Per the New York Times rent-vs-buy methodology
(published) and the AICPA personal-finance guide. Estimate
only; tax treatment varies. Free at consumerfinance.gov for
homebuyer materials."

**Edge cases.** Holding period above 30 years flagged. Down
payment above purchase price rejected.

**Tests.** Eight unit tests covering a high-appreciation /
low-rent market, a low-appreciation / high-rent market, and a
break-even case.

### X.3 Per-diem prorated interest at closing

**Inputs.** Loan amount, annual rate (percent), closing date,
first-payment due date, day-count convention (Actual/365 or
Actual/360 or 30/360; default 365).

**Output.** Daily interest (dollars), days from closing to end
of month, per-diem interest at closing (dollars), and the
prepaid-interest line item that should appear on the Closing
Disclosure.

**Math.** Public:

    daily_interest = loan_amount * rate / day_count_basis
    prepaid = daily_interest * days_to_eom

**Citation.** "Per the CFPB Closing Disclosure form (12 CFR
1026.38, Appendix H). Day-count convention varies by lender;
typically 365 for owner-occupied conventional. Free at
consumerfinance.gov."

**Edge cases.** Closing date after first-payment date flagged.

**Tests.** Six unit tests.

### X.4 Reserves requirement (months PITI)

**Inputs.** PITI monthly (dollars; or compute from X.1), reserves
months required (varies by loan type: conventional 2 to 6,
jumbo 6 to 12, investment property 6 to 12), existing liquid
assets (dollars).

**Output.** Required reserves (dollars), shortfall or surplus,
recommended documentation list (bank statements, retirement
accounts at percent allowable), and a banner that reserves
requirements vary by lender and program.

**Math.** Arithmetic.

**Citation.** "Per Fannie Mae Selling Guide B3-4.1-01 (reserves)
and Freddie Mac Single-Family Seller/Servicer Guide 5501.1.
Lender governs final requirement. Free at fanniemae.com and
freddiemac.com for guides."

**Edge cases.** Reserves months above 24 flagged as outside
typical agency range.

**Tests.** Six unit tests.

### X.5 Income-method valuation (GRM and cap rate)

**Inputs.** Gross annual rental income (dollars), vacancy rate
(percent; default 5), operating expenses (dollars; from a list
of typical items the user fills in), property purchase price
(dollars; optional).

**Output.** Effective gross income, net operating income (NOI),
gross rent multiplier (GRM = price / GRI), cap rate
(NOI / price), and DSCR if a mortgage is entered (uses v12 X.5
engine).

**Math.** Public arithmetic.

**Citation.** "Per the Appraisal Institute 'Appraisal of Real
Estate' 15th ed. and IRS Publication 527 (Residential Rental
Property). Free at irs.gov/forms-pubs for Pub 527."

**Edge cases.** Cap rate above 15 percent flagged as either
distressed property or input error. Vacancy below 1 percent
flagged as optimistic.

**Tests.** Six unit tests.

## 6. Phase Y — Educators deepening (Group Y)

Four new tiles.

### Y.1 Standard deviation and z-score

**Inputs.** Data series (CSV paste or row-by-row input), or
mean / standard deviation entered directly with an observation x.

**Output.** Sample mean, sample standard deviation (n-1
denominator), population standard deviation (n denominator), and
for the entered x: z-score, percentile (from normal-table
bundled values), and a histogram (SVG, accessible).

**Math.** Public statistics. Normal-distribution percentile from
the bundled error-function approximation (Abramowitz and Stegun
26.2.17, 7-digit accuracy).

**Citation.** "First-principles statistics. Per any introductory
stats text (OpenIntro Statistics, free at openintro.org)."

**Edge cases.** Series below 2 observations rejected. Non-numeric
entries flagged and dropped.

**Tests.** Eight unit tests including a small series and a
1000-value series.

### Y.2 Linear regression (slope, intercept, R^2)

**Inputs.** Paired data series (x, y) via CSV paste or row-by-
row input.

**Output.** Slope, intercept, R^2, Pearson r, residual sum of
squares, residual standard error, scatter plot with fitted line
(SVG, accessible).

**Math.** Public least-squares regression closed-form.

**Citation.** "First-principles statistics. Per OpenIntro
Statistics chapter 8 (linear regression). Free at openintro.org."

**Edge cases.** Series below 3 pairs rejected. Constant x-series
rejected (slope undefined).

**Tests.** Eight unit tests including the Anscombe's quartet
data sets.

### Y.3 Chi-square goodness-of-fit

**Inputs.** Observed counts (CSV or row entry), expected counts
or expected proportions (CSV or row entry), significance level
(0.10, 0.05, 0.01).

**Output.** Chi-square statistic, degrees of freedom (k - 1 for
goodness-of-fit), p-value (from a bundled incomplete-gamma
approximation), and a reject / fail-to-reject verdict at the
entered alpha.

**Math.** Public:

    chi2 = sum((O - E)^2 / E)

p-value from the chi-square cumulative distribution function
via the bundled incomplete-gamma function (Numerical Recipes
6.2 method, 7-digit accuracy).

**Citation.** "First-principles statistics. Per OpenIntro
Statistics chapter 6 and Numerical Recipes in C 2nd ed. (free
chapters online at numerical.recipes)."

**Edge cases.** Any expected count below 5 flagged (chi-square
approximation degrades; Fisher's exact suggested).

**Tests.** Six unit tests.

### Y.4 Pearson correlation coefficient

**Inputs.** Paired data series (x, y). Significance test toggle.

**Output.** Pearson r, R^2, t-statistic for the null r = 0,
degrees of freedom (n - 2), p-value (from bundled t-distribution
CDF), and a verdict at the user-entered alpha.

**Math.** Public Pearson correlation formula. t = r *
sqrt(n - 2) / sqrt(1 - r^2). p-value from the bundled
t-distribution CDF (incomplete-beta function).

**Citation.** "Per OpenIntro Statistics chapter 8 and Numerical
Recipes in C 2nd ed. Free at openintro.org and
numerical.recipes."

**Edge cases.** Series below 3 pairs rejected. r outside (-1, 1)
indicates numerical-precision error and is flagged.

**Tests.** Six unit tests.

## 7. Phase R — Accounting and Tax deepening (Group R)

Four new tiles.

### R.1 Quarterly estimated tax (1040-ES)

**Inputs.** Expected AGI (dollars), filing status, expected
withholding (dollars), prior-year tax (dollars; for safe-harbor
test), state of residence (state-keyed shard for state ES).

**Output.** Federal Q1 / Q2 / Q3 / Q4 estimated-tax payments
(dollars; rate-bracket math per IRS Publication 505 worksheet),
safe-harbor amount (100 percent of prior-year tax, 110 percent
if AGI > 150k), state ES estimate via state-keyed shard, and an
IRS Direct Pay link.

**Math.** Public IRS rate tables (the brackets, standard
deduction, and AMT thresholds are public for the asOf-stamped
year). State-keyed shards per spec-v12 §H.2.

**Citation.** "Per IRS Publication 505 (Tax Withholding and
Estimated Tax) and Form 1040-ES. Tax law changes; verify against
the current edition or a licensed CPA. Free at irs.gov/forms-pubs."

**Edge cases.** AGI above the IRS Publication 505 worksheet
upper bound flagged. Self-employment income flagged for
cross-check with R.4 Schedule SE.

**Tests.** Eight unit tests including a Schedule C filer at
75k, 150k, and 350k AGI.

### R.2 Mileage deduction

**Inputs.** Business miles, medical miles, charitable miles,
moving miles (active-duty military only), tax year, optional
total miles driven (for business-use percent if actual-expense
method considered).

**Output.** Deduction at the IRS standard mileage rate for each
category (rates per IRS Pub 463, bundled per asOf-stamped year),
total deduction, and an actual-expenses-method estimate line if
total miles entered (the user supplies vehicle costs).

**Math.** Arithmetic. Mileage rates per IRS published per year
(state-keyed only by tax year, not state; a yearly-shard).

**Citation.** "Per IRS Publication 463 (Travel, Gift, and Car
Expenses) and IRS Revenue Procedure releases each January for the
standard mileage rate. Free at irs.gov."

**Edge cases.** Moving-miles entered without active-duty-military
flag rejected with explanation (Tax Cuts and Jobs Act 2017
suspension).

**Tests.** Six unit tests across recent tax years.

### R.3 Home office simplified vs actual

**Inputs.** Home office square footage, total home square
footage, total home expenses (utilities, mortgage interest,
property tax, insurance, depreciation), tax year.

**Output.** Simplified-method deduction ($5 per ft^2 up to 300
ft^2, $1500 cap per IRS), actual-expenses-method deduction (with
the home-office percent applied), the higher of the two, and a
banner that the actual method requires Form 8829 and recapture
on sale.

**Math.** Arithmetic per IRS Pub 587.

**Citation.** "Per IRS Publication 587 (Business Use of Your
Home) and Form 8829. Estimate only; tax law changes. Free at
irs.gov."

**Edge cases.** Home office above 300 ft^2 cap on simplified
method noted. Office percent above 50 percent flagged as
unusual.

**Tests.** Six unit tests.

### R.4 Schedule SE self-employment tax

**Inputs.** Net SE earnings (dollars), W-2 wages subject to
Social Security (dollars; for combined SS wage-base check), tax
year (for SS wage base shard).

**Output.** Net earnings from SE (92.35 percent of net SE per
the Schedule SE worksheet), Social Security portion (12.4
percent up to the year's wage base less existing W-2 wages),
Medicare portion (2.9 percent on all net SE earnings), Additional
Medicare 0.9 percent above the threshold, total SE tax, and the
deductible-half SE tax (above-the-line deduction).

**Math.** Public per Schedule SE Long. SS wage base per year is
a yearly shard.

**Citation.** "Per IRS Schedule SE and Publication 533 (Self-
Employment Tax). Free at irs.gov."

**Edge cases.** Net SE below $400 flagged as below filing
threshold for Schedule SE.

**Tests.** Eight unit tests across recent tax years and including
a high-earner case above the SS wage base.

## 8. Phase S — Legal deepening (Group S)

Three new tiles.

### S.1 Wage garnishment cap (federal Title III + state max)

**Inputs.** Disposable earnings per pay period (dollars), pay
period (weekly / biweekly / semi-monthly / monthly), federal
minimum wage (bundled, asOf), state of residence (state-keyed
shard), garnishment type (consumer debt / child support / federal
tax / student loan).

**Output.** Title III maximum (lesser of 25 percent of
disposable or disposable minus 30 times federal min wage),
state maximum if more restrictive (state-keyed shard), maximum
allowable garnishment per pay period, and the protected portion.

**Math.** Public per 15 USC 1673 and state codes.

**Citation.** "Per 15 USC 1673 (Consumer Credit Protection Act,
Title III) and DOL Wage and Hour Division Fact Sheet 30. State
maxima per state code. Free at dol.gov/agencies/whd/fact-sheets."

**Edge cases.** Multiple concurrent garnishments flagged as
needing priority-of-claims analysis (federal-tax takes precedence
over consumer, etc.).

**Tests.** Eight unit tests covering federal-only and several
state caps.

### S.2 Federal court FRCP Rule 6 deadline

**Inputs.** Triggering event date, deadline period (days; e.g.,
14, 21, 28, 30), period type (calendar days per FRCP 6(a)(1) or
business days, rare), federal court selector (sets the federal-
holiday calendar; same nationally but Sunday + Federal holiday
adjustments apply).

**Output.** Deadline date, day-by-day count (showing skipped
weekends / holidays per the period type), and a banner that
the actual filing deadline depends on local rules and the
chosen court's clock.

**Math.** Public FRCP 6(a) day-counting rules. Federal holidays
bundled per OPM published list (the list is asOf-stamped per
v12 §H.2).

**Citation.** "Per Federal Rules of Civil Procedure Rule 6(a) and
the local rules of the relevant district. Free at uscourts.gov
for FRCP and individual district websites for local rules."

**Edge cases.** Deadline falling on a weekend or federal holiday
extended to next business day per FRCP 6(a)(1)(C). State-court
deadlines explicitly out of scope (this tile is FRCP only).

**Tests.** Eight unit tests including deadlines crossing Memorial
Day, Independence Day, and a Saturday-Sunday weekend.

### S.3 Prejudgment interest accrual

**Inputs.** Principal amount (dollars), interest rate (annual
percent; state-keyed shard for the state's prejudgment interest
rate, with user override), accrual start date, accrual end date,
compounding (simple / annual / quarterly / monthly), state of
filing.

**Output.** Days of accrual, accrued interest (dollars), total
amount due (principal + interest), and an itemization of the
calculation method.

**Math.** Public per state statute (e.g., New York CPLR 5004
sets 9 percent simple; California Civil Code 3287 sets 10
percent simple). State-keyed shard.

**Citation.** "Per the state-specific statute governing
prejudgment interest. NY CPLR 5004 (9 percent), CA Civ Code 3287
(10 percent), TX Finance Code 304.103 (5 percent), etc. Free at
state legislative websites."

**Edge cases.** Accrual end before start rejected. Rate above 18
percent flagged as outside typical state ranges.

**Tests.** Eight unit tests covering simple and compounded across
three states.

## 9. Phase T — Lab (Bench Science) deepening (Group T)

Three new tiles.

### T.1 Henderson-Hasselbalch buffer

**Inputs.** Buffer pair (acetate / phosphate / Tris / bicarbonate /
HEPES / MES / MOPS / citrate; pKa bundled from CRC Handbook),
target pH, total buffer concentration (M), volume (mL).

**Output.** Required mass of acid (g) and conjugate base (g), or
acid-and-titrant volumes if user enters stock concentrations,
expected ionic strength, and a banner about temperature
dependence of pKa (especially Tris).

**Math.** Public:

    pH = pKa + log10([A-]/[HA])

Concentrations solved for given total and ratio; mass from
molarity * volume * molecular weight.

**Citation.** "Per Henderson L.J. and Hasselbalch K.A. (1908-
1916). pKa and MW values from the CRC Handbook of Chemistry and
Physics 102nd ed. Verify against your lab's SOP. Free at
nist.gov/chemistry-webbook for buffer constants."

**Edge cases.** Target pH outside pKa +/- 2 flagged as poor
buffering. Tris near 4 C or 37 C flagged for temperature
correction (-0.028 pH per C from 25 C).

**Tests.** Eight unit tests including 100 mM phosphate at pH
7.4 against a published recipe.

### T.2 Molar / mass / volume solver

**Inputs.** Any three of: molarity (M), mass (g), molecular
weight (g/mol), volume (L or mL).

**Output.** The fourth quantity, plus normality if user enters
equivalents-per-mole, and a percent-w/v line.

**Math.** Public: moles = mass / MW; M = moles / V.

**Citation.** "First-principles solution chemistry. CRC Handbook
of Chemistry and Physics for molecular weights. Free at
chem.libretexts.org for general reference."

**Edge cases.** Mass or volume below detection limit flagged.

**Tests.** Six unit tests covering each three-input combination.

### T.3 Spectrophotometer Beer-Lambert solver

**Inputs.** Any three of: absorbance (AU), molar extinction
coefficient (M^-1 cm^-1), path length (cm), concentration (M).

**Output.** The fourth quantity, plus a transmittance line
(%T = 10^(-A) * 100), and a banner about linearity range
(absorbance below 0.1 or above 2.0 flagged as outside the
linear range of most instruments).

**Math.** Public Beer-Lambert: A = epsilon * c * l.

**Citation.** "Per any analytical-chemistry textbook (Skoog,
Harris). Beer-Lambert law. Free at chem.libretexts.org."

**Edge cases.** Negative absorbance rejected (instrument
baseline issue suggested).

**Tests.** Six unit tests.

## 10. Phase L — Agriculture deepening (Group L)

Five new tiles.

### L.1 Acre-foot irrigation requirement (ET-based)

**Inputs.** Crop type (alfalfa / corn / cotton / wheat / pasture /
turfgrass / vegetables; ET coefficient Kc bundled), reference ET
(in/day; user enters from state CIMIS / Mesonet / NOAA station
or AHJ default), field area (acres), irrigation efficiency
(percent; 75 for sprinkler, 90 for drip, 50 for flood),
rainfall (in over the period).

**Output.** Crop ET demand (in), net irrigation requirement
(in), gross irrigation requirement (in / acre-ft), total volume
(acre-ft / gal), and a comparison band against the entered water
right or allocation.

**Math.** Public:

    ET_crop = Kc * ET_ref
    gross_in = max(0, ET_crop - rainfall) / efficiency
    acre_ft = gross_in * area_ac / 12

**Citation.** "Per FAO Irrigation and Drainage Paper 56 (Crop
Evapotranspiration, Allen et al. 1998) and USDA NRCS Irrigation
Guide. Kc values per FAO 56 Table 12. Free at fao.org."

**Edge cases.** Kc outside (0.2, 1.4) flagged as outside typical
crop-coefficient range.

**Tests.** Eight unit tests.

### L.2 NPK blend from soil test

**Inputs.** Soil test N / P / K values (lb/acre), crop nutrient
demand (lb/acre by crop; bundled from USDA NRCS Agronomy
Technical Note ranges), fertilizer products available (each:
N / P2O5 / K2O percent), field area (acres).

**Output.** Recommended application rate for each product
(lb/acre and lb total), total nutrients delivered, and a flag
if any nutrient is over-applied (lost to leaching / runoff risk).

**Math.** Linear-programming-ish nutrient balance; the tile
shows the math step-by-step (not a black box).

**Citation.** "Per USDA NRCS Agronomy Technical Note ranges and
the state Cooperative Extension Service published recommendations
(state-keyed). Soil test values from a certified lab govern.
Free at nrcs.usda.gov."

**Edge cases.** N above 250 lb/acre flagged as excessive for
most crops. P above 100 lb/acre flagged as buildup risk.

**Tests.** Eight unit tests.

### L.3 Cattle stocking rate (AUM)

**Inputs.** Pasture area (acres), forage production (lb/acre per
season; user enters from a NRCS Ecological Site Description or
clip-and-weigh sample), utilization rate (percent; default 25 to
50 for arid range, 50 to 70 for tame pasture), animal class
(cow-calf / yearling / sheep / horse; sets AU equivalent).

**Output.** Available forage (lb), AUMs available, stocking rate
(head per acre or acres per head), grazing days at user-entered
herd size, and a banner indicating that drought / climate
adjustments are essential.

**Math.** Public:

    available_forage = production * area * utilization
    AUMs = available_forage / 780   // 26 lb dry matter per day * 30 days

**Citation.** "Per USDA NRCS National Range and Pasture Handbook
chapter 6 (stocking rate). Free at nrcs.usda.gov for the
handbook."

**Edge cases.** Utilization above 60 percent flagged as
overgrazing risk on rangeland.

**Tests.** Six unit tests.

### L.4 Grain bin capacity

**Inputs.** Bin diameter (ft), eave height (cylindrical wall, ft),
peak height (cone, ft), grain type (corn / wheat / soybeans /
oats; sets test weight lb/bu), packing factor (default 1.0
free-flow, 1.05 packed).

**Output.** Cylinder volume (ft^3, bushels), cone volume (ft^3,
bushels), total bushels at the entered packing factor, and a
USDA-standard test-weight conversion to lbs.

**Math.** Public geometry. Cylinder + cone. Bushels = ft^3 *
0.8036.

**Citation.** "Per USDA FGIS (Federal Grain Inspection Service)
test-weight standards. Bin geometry first-principles. Free at
ams.usda.gov/services/grain-inspection."

**Edge cases.** Bin diameter above 105 ft flagged as outside
typical farm range. Bushels above 1 million flagged as
commercial-engineered.

**Tests.** Six unit tests.

### L.5 Pesticide tank-mix and acres-per-tank

**Inputs.** Tank capacity (gal), application rate (GPA), boom
width (ft), travel speed (mph), product rate (oz/acre or
lb/acre), product percent active ingredient.

**Output.** Acres treated per tank, product per tank (oz or lb,
volume in mL or gal), nozzle calibration GPM per nozzle, REI
(re-entry interval) reminder from a user-entered EPA label
section, and a banner that the EPA label is the law.

**Math.** Public:

    acres_per_tank = tank_gal / GPA
    product_per_tank = acres_per_tank * rate_per_acre
    nozzle_GPM = (GPA * boom_width_ft * mph) / (5940 * nozzle_count)

**Citation.** "Per the EPA pesticide label (the label is the
law per FIFRA). Tank-mix math first-principles. NRCS Agronomy
Technical Note 5 for spray calibration. Free at epa.gov/pesticide-labels
for label search."

**Edge cases.** GPA below 5 or above 30 flagged as outside
typical boom-spray range. Speed above 12 mph flagged as outside
calibration band for most equipment.

**Tests.** Eight unit tests.

## 11. Phase Z — Cross-cutting platform and manifest changes

### Z.1 Manifest entries

35 new entries in `tile-meta.js`, each carrying editions, asOf,
tolerance, worked_example, and reviewer_signoff fields per
spec-v10 and spec-v14. Where a tile depends on a state-keyed
shard (R.1 ES quarterly, R.4 SE wage base, S.1 garnishment, S.3
prejudgment interest, L.1 ET reference), the shard manifest is
declared per spec-v12 §H.2 with its refresh cadence.

### Z.2 Calc modules

No new calc-*.js modules. Distribution:

- U.1 through U.5 -> `calc-vet.js`
- V.1 through V.6 -> `calc-ems.js`
- W.1 through W.5 -> `calc-aviation.js`
- X.1 through X.5 -> `calc-realestate.js`
- Y.1 through Y.4 -> `calc-edu.js`
- R.1 through R.4 -> `calc-accounting.js`
- S.1 through S.3 -> `calc-legal.js`
- T.1 through T.3 -> `calc-lab.js`
- L.1 through L.5 -> `calc-agriculture.js`

### Z.3 Tests, search aliases, parity audits

Same gates as v15 §H and v16 §Z. Every new tile lands with its
declared test count, at least three search aliases, and clean
axe-core, print, and CSV parity audits.

### Z.4 Statistical and special-function helpers

Y.1, Y.3, and Y.4 require numeric implementations of the error
function, incomplete-gamma function, and incomplete-beta function.
These land in a new section of `pure-math.js`:

- `erf(x)` and `erfInv(x)` to 7-digit accuracy per Abramowitz and
  Stegun 26.2.17 and the Acklam inversion approximation.
- `gammainc(a, x)` to 7-digit accuracy per Numerical Recipes 6.2
  series / continued-fraction split.
- `betainc(x, a, b)` to 7-digit accuracy per Numerical Recipes 6.4.
- `tcdf(t, df)` derived from `betainc`.
- `normCdf(z)` derived from `erf`.
- `chi2Cdf(x, df)` derived from `gammainc`.

Each helper carries a worked-example test against a published
table value (e.g., Abramowitz and Stegun Tables 26.1 and 26.7),
matching the v14 §C.3 tolerance discipline.

### Z.5 State-keyed shard work

v17 adds five new state-keyed shards:

- `data/tax/estimated-quarterly-state.json` (R.1)
- `data/tax/se-wage-base.json` (R.4) — yearly, single-keyed
- `data/legal/garnishment-state.json` (S.1)
- `data/legal/prejudgment-interest-state.json` (S.3)
- `data/agriculture/et-reference-state.json` (L.1)

Each shard carries an `editions` array, an `asOf` date, and a
`refresh_cadence` per spec-v12 §H.1 (yearly for tax, monthly for
legal, weekly for L.1 ET reference during growing season).

### Z.6 Per-group reviewer signoff

Per spec-v14 §15, the v17 expansion solicits the following
reviewer-of-record signoffs:

- Group U: a US-licensed DVM (sought).
- Group V: a US-licensed paramedic or EMT-P with QA / education
  experience (sought).
- Group W: an active US ATP-rated pilot or CFI-I (sought).
- Group X: a US-licensed real estate broker with a CCIM or
  equivalent (sought).
- Group Y: a US public-school teacher or community-college
  faculty member with quantitative-courseware experience
  (sought).
- Group R: a US-licensed CPA (sought; not licensed enrolled
  agent because R.1 / R.4 cover Schedule SE which is solidly in
  CPA scope).
- Group S: a US-licensed attorney with civil-practice experience
  (sought).
- Group T: a US bench scientist with peer-reviewed publication
  history (sought).
- Group L: a USDA NRCS technical service provider or US
  Cooperative Extension agronomist (sought).

Open signoffs do not block v17 from landing in main; they block
the v17 release announcement from carrying the "audited" label
per the v14 audit-trail convention. The audit-trail entries for
each Group land in [../docs/audit-trail.md](../docs/audit-trail.md)
under the v17 stanza.

## 12. Reading the trio together

v15 + v16 + v17 add exactly 100 tiles. v15 closed the trades-core
gaps the first 14 specs left open (35 tiles in A / E / F / G).
v16 deepened the mechanical / plumbing / HVAC / restoration /
water professional surface (30 tiles in B / C / D / N). v17
deepened the allied-profession surface the v5 and v12 specs
opened (35 tiles in U / V / W / X / Y / R / S / T / L). The
catalog total stands at 485 tiles after the trio lands.

The trio shares one design promise: every tile is a number a
specific professional reaches for once a week or once a day; that
number is currently behind a paywall or a captcha or a chatbot
or a third-party calculator nobody can vouch for; this site
puts it in front of the professional in two seconds with a
citation, a source-stamp, a tolerance, and a copy-to-clipboard.
The professional supplies the judgment. The site supplies the
math.

## 13. Out of scope for v17 (and for the trio)

- New groups beyond the existing nineteen letters.
- Telemetry, AI, accounts, server, fee, ad. (No spec since v1 has
  proposed any of these; the trio does not propose them either.)
- Internationalization beyond US standards. ASHRAE Fundamentals,
  IRS, IPC, IRC, NEC, FRCP, NFPA, USDA, EPA, IICRC, FAA, AAEP,
  AVMA, ACEP, AHA / ASA, AICPA, APSP, ACI, AWWA, NSPF, CTI, AGMA,
  IFI, AISC, AWC, NPGA, USC FCCCHR, CIMIS / Mesonet, OPM federal
  holidays — every authority the trio cites is US. International
  expansion is its own future spec.
- Live-data alerts, push notifications, SMS, server-pushed
  updates: still no. The site is still a static client-side
  bundle.

## 14. Closing note

The site was always going to grow. It will only ever grow
methodically. 100 tiles, three specs, nineteen groups, one
reviewer signoff per group, one worked-example cross-check per
tile, one tolerance per tile, one citation per tile, one
source-stamp per tile, one copy-to-clipboard, no telemetry, no
AI, no fee, no email.

The professional who finds the site by typing six words into a
search engine and saves their afternoon: that is the only
audience the trio is built for, and it is the only audience the
site has ever been built for.

Build it the way the rest was built. One tile at a time.
