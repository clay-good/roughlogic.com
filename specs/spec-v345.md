# roughlogic.com Specification v345 -- Break-Even Occupancy (calc-realestate.js, Group X, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.121.0). Batch spec-v344..v346 (the real-estate underwriting trio -- debt yield
> (v344), the break-even occupancy (this spec), the fix-and-flip 70% rule (v346)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `breakeven` computes an accounting contribution-margin
> break-even in units, but a rental property's break-even is an occupancy percentage -- the share of potential gross income
> that must be collected to cover operating expenses plus debt service. It is a core risk metric no real-estate tile
> computes. Adds one tile to the existing **`calc-realestate.js`** module (Group X); no new group, trade, or dependency.
> Inherits spec.md through spec-v344.md.
>
> **The gap, and the evidence for it.** The break-even occupancy is the fraction of potential gross income needed to cover
> the cash outflows: `BEO = (operating expenses + annual debt service) / potential gross income x 100`. For a property with
> `$60,000` of operating expenses, `$90,000` of annual debt service, and `$200,000` of potential gross income (fully
> leased), `BEO = 150,000/200,000 = 75%` -- the property covers its costs at 75% occupancy, so a 25% vacancy cushion stands
> between it and negative cash flow. A lender or investor compares this to the market vacancy rate: a break-even above the
> submarket's stabilized occupancy is a red flag. `breakeven` handles a business's unit economics; this tile handles a
> rental's occupancy risk.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The operating expenses, annual
debt service, and potential gross income are currency; the break-even occupancy and the cushion to a target occupancy are
dimensionless percentages. The v18/v21 contract: any non-finite input, or a potential gross income at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the break-even-occupancy definition by name;
`editionNote` names **the break-even (default-ratio) occupancy `BEO = (OpEx + annual debt service) / PGI`, the potential
gross income as the fully-leased rent plus other income, and the comparison to market/stabilized occupancy, as compiled in
the CRE and multifamily underwriting references**, and states that **this returns the break-even occupancy and the cushion
to an entered stabilized occupancy -- it uses the entered operating expenses (excluding capital reserves unless included by
choice) and the actual annual debt service (principal plus interest), takes potential gross income at full occupancy, and
does not compute the NOI or the debt service themselves (`rental-worksheet`, `loan-payment`); and this is an underwriting
aid** -- the lender's and investor's underwriting govern.

## 2. The tile

### 2.1 `break-even-occupancy` -- Break-Even Occupancy

```
inputs:
  opex        $    annual operating expenses
  debt_svc    $    annual debt service (P + I)
  pgi         $    potential gross income (fully leased + other income)
  target_occ  %    market/stabilized occupancy (optional, for cushion)

BEO = (opex + debt_svc) / pgi * 100                ; break-even occupancy, %
cushion = target_occ - BEO                          ; cushion to break-even (if target given)
```

**Pinned worked example (OpEx $60,000, debt service $90,000, PGI $200,000).** `BEO = (60,000 + 90,000)/200,000 x 100 = 75%`.
Against a 92% stabilized market occupancy, the cushion is `92 - 75 = 17` points before the property goes cash-flow negative.
**Cross-check (a higher-leverage deal, debt service $120,000).** `BEO = (60,000 + 120,000)/200,000 = 90%` -- the extra
leverage pushes break-even to 90%, leaving only a 2-point cushion to the 92% market, the thin margin that makes a
highly-leveraged deal fragile to a single vacancy. The non-finite and non-positive-PGI error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate","small-business"]`, matching `cap-rate-dscr`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the break-even-occupancy definition, `editionNote` naming
`BEO = (OpEx + debt service)/PGI`, the PGI basis, the market-occupancy comparison, and the enter-OpEx/debt-service,
underwriting-aid caveats); `test/fixtures/worked-examples.json` (the base example + the high-leverage cross-check);
`test/fixtures/compute-map.js` (`break-even-occupancy` -> `computeBreakEvenOccupancy` in `../../calc-realestate.js`);
`scripts/related-tiles.mjs` (-> `cap-rate-dscr` / `debt-yield` / `rental-worksheet` / `rent-roll-vacancy`);
`data/search/aliases.json` ("break-even occupancy", "breakeven occupancy real estate", "default ratio", "occupancy
break-even", "rental break-even", "vacancy cushion", "OpEx plus debt service", "cash flow break-even", "economic
occupancy"); the id appended to the existing realestate renderers block in `app.js`; the `// dims:` annotation
(`opex`/`debt_svc`/`pgi` currency, `BEO`/`target_occ`/`cushion` percent); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the cushion computation, and the non-positive-PGI / non-finite error
seams. No new module; re-pin `calc-realestate.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the cushion assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `BEO` / cushion pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (150k/200k -> 75%).

## 5. Roadmap position

Middle of the real-estate underwriting batch (v344..v346) in `calc-realestate.js`, adding the occupancy risk metric to the
debt-yield and DSCR tiles. The 70% rule (v346) follows. An expense-ratio and reserve-inclusive variant, a stressed-vacancy
sensitivity, and a chain from `rental-worksheet` and `loan-payment` are the deliberate next follow-ons once the trio lands.
