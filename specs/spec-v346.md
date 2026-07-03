# roughlogic.com Specification v346 -- Fix-and-Flip Maximum Offer (70% Rule) (calc-realestate.js, Group X, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.121.0). Batch spec-v344..v346 (the real-estate underwriting trio -- debt yield
> (v344), break-even occupancy (v345), the fix-and-flip 70% max-offer rule (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog underwrites rentals but has no fix-and-flip
> tile -- the 70% rule that sets the maximum a flipper should pay from the after-repair value and the repair budget, the
> single most-cited number in residential rehab. Adds one tile to the existing **`calc-realestate.js`** module (Group X); no
> new group, trade, or dependency. Inherits spec.md through spec-v345.md.
>
> **The gap, and the evidence for it.** The 70% rule sets the maximum allowable offer on a flip as
> `MAO = ARV x 0.70 - repair costs`, where `ARV` is the after-repair value and the 30% haircut covers the holding, selling,
> and financing costs plus the flipper's profit. For a house with a `$300,000` ARV needing `$40,000` of repairs,
> `MAO = 300,000 x 0.70 - 40,000 = 210,000 - 40,000 = $170,000` -- the ceiling a flipper offers, above which the deal's
> margin evaporates. The percentage is a lever: a hotter market or a wholesaler might stretch to 75%, a thinner one holds at
> 65%, and the tile shows how the max offer moves with it. This is the acquisition screen the rental tiles never provided.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The after-repair value, repair
costs, maximum allowable offer, and the implied gross spread are currency; the rule percentage is a dimensionless fraction.
The v18/v21 contract: any non-finite input, an ARV or repair cost at or below zero, or a rule percentage outside
`0 < pct <= 1` returns `{ error }`; a negative maximum offer (repairs exceed the discounted ARV) is reported as "no deal."
Citation discipline (v19/v22): `GOVERNANCE.general` over the 70%-rule heuristic by name; `editionNote` names **the maximum
allowable offer `MAO = ARV x rule% - repair costs`, the customary 70% (the 30% covering holding, financing, selling costs,
and profit), and that wholesalers subtract their assignment fee as well, as compiled in the residential-rehab references**,
and states that **this returns the heuristic maximum offer -- it is a rule-of-thumb screen (a full flip analysis itemizes
the holding, financing, and selling costs and the target profit, which the 30% only approximates), takes the ARV from
comparable sales and the repair budget from a scope, and does not verify either; and this is an acquisition-screen aid, not
an appraisal or a deal analysis** -- comparable sales, a contractor's scope, and the investor's actual cost structure
govern.

## 2. The tile

### 2.1 `max-offer-70-rule` -- Fix-and-Flip Maximum Offer (70% Rule)

```
inputs:
  arv        $    after-repair value (from comps)
  repairs    $    estimated repair/rehab costs
  rule_pct   %    rule percentage (default 70)
  fee        $    wholesale assignment fee (optional, subtracted)

MAO = arv * (rule_pct/100) - repairs - fee         ; maximum allowable offer, $
spread = arv - MAO - repairs                        ; gross spread left for costs + profit
```

**Pinned worked example (ARV $300,000, repairs $40,000, 70% rule).** `MAO = 300,000 x 0.70 - 40,000 = 210,000 - 40,000 = $170,000`;
the gross spread `= 300,000 - 170,000 - 40,000 = $90,000` (the 30% of ARV) covers holding, financing, selling costs, and
profit. **Cross-check (a competitive market at 75%, with a $10,000 wholesale fee).** `MAO = 300,000 x 0.75 - 40,000 - 10,000 = 225,000 - 50,000 = $175,000`
-- the higher percentage lifts the offer $15,000 but the assignment fee gives $10,000 back, the two levers a wholesaler and
a flipper negotiate over. The non-finite, non-positive, and out-of-range-percentage error paths bracket the result, and a
negative `MAO` returns "no deal."

## 3. Wiring

A `tools-data.js` row (group `X`, trades `["real-estate","small-business"]`, matching `cap-rate-dscr`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the 70%-rule heuristic, `editionNote` naming
`MAO = ARV x rule% - repairs`, the 30% haircut composition, the wholesale fee, and the rule-of-thumb, unverified-inputs
caveats); `test/fixtures/worked-examples.json` (the 70% example + the 75%-with-fee cross-check);
`test/fixtures/compute-map.js` (`max-offer-70-rule` -> `computeMaxOffer70Rule` in `../../calc-realestate.js`);
`scripts/related-tiles.mjs` (-> `cap-rate-dscr` / `rent-vs-buy` / `seller-net-sheet` / `material-cost`);
`data/search/aliases.json` ("70 percent rule", "maximum allowable offer", "MAO", "fix and flip offer", "ARV rule",
"flip max offer", "after repair value offer", "wholesale offer", "rehab offer"); the id appended to the existing realestate
renderers block in `app.js`; the `// dims:` annotation (currency values currency, `rule_pct` percent);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the fee subtraction, the
no-deal negative case, and the out-of-range-percentage / non-positive / non-finite error seams. No new module; re-pin
`calc-realestate.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the no-deal assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `MAO` / spread pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (ARV 300k, repairs 40k -> $170,000).

## 5. Roadmap position

Closes the real-estate underwriting batch (v344..v346) in `calc-realestate.js`: debt yield, break-even occupancy, and the
70% rule now span rental loan-sizing, occupancy risk, and flip acquisition. An itemized flip-cost analysis (holding,
financing, selling, profit), a wholesale-double-close variant, and a rehab-scope chain into `material-cost` are the
deliberate next follow-ons once the trio lands.
