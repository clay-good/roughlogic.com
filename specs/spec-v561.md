# roughlogic.com Specification v561 -- EV Load-Management (EVEMS) Diversified Service Load (calc-feeder.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-feeder.js`**
> (Group A, the feeder / service bench); no new module, group, or dependency. Inherits spec.md through spec-v560.md.
>
> **The gap, and the evidence for it.** `ev-charger-load` sizes a single EVSE at 125% of its continuous load, but a
> site with several chargers does not have to give each one a full allotment. NEC 625.42(A) permits an energy
> management system (EVEMS) to limit the aggregate charging load, and the bench has no tile for that diversified number.
> The catch is exactly this: without EVEMS the service must carry the **sum** of every charger at 125%, which forces an
> expensive service upgrade for a bank of chargers; with a listed EVEMS the demand is the **aggregate limit** the system
> enforces, not the sum, and the freed headroom is often enormous. The 2026 NEC (625.48) still applies the 125%
> continuous factor to the EVEMS setpoint. The tile takes the number and rating of the chargers and the EVEMS aggregate
> limit, and returns the un-managed sum, the managed demand, and the freed headroom -- the number that lets four
> chargers land on a panel sized for one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The per-charger rating,
the un-managed sum, the EVEMS limit, the managed demand, and the freed headroom are currents (`I`, in amps); the count
of chargers and the 1.25 factor are `dimensionless`. The v18/v21 contract: any non-finite input, a charger count below
1, a non-positive per-charger rating, or a non-positive EVEMS limit (when management is used) returns `{ error }`.
Citation discipline (v19/v22): `NEC` over 625.42; `editionNote` names **NEC 2023 625.42(A) (energy management systems)
with the 2026 625.48 continuous factor**, prints the un-managed sum `1.25 x per_charger x count`, the managed demand
`1.25 x evems_limit` (the 2026 continuous treatment of the setpoint), and the freed headroom, and states that **without
an EVEMS the service must carry the sum of all chargers at 125% (forcing an upgrade), a listed EVEMS lets the demand be
the aggregate limit it enforces rather than the sum, the 2026 NEC applies the 125% continuous factor to the EVEMS
setpoint, the EVEMS must be listed and its setpoint enforced in hardware, and the NEC and the AHJ govern** -- a design
aid, not the AHJ.

## 2. The tile

### 2.1 `ev-load-management-ems` -- Why Four Chargers Do Not Each Need a Full 125% Allotment

```
inputs:
  charger_count      -    number of EVSE
  per_charger_a      A    each charger's continuous rating
  evems_limit_a      A    EVEMS aggregate current limit (0 = no management)
  apply_125_setpoint bool apply the 2026 625.48 continuous factor to the EVEMS setpoint (default true)

unmanaged_sum = 1.25 x per_charger_a x charger_count                          [A]
managed_demand = evems_limit_a > 0 ? (apply_125_setpoint ? 1.25 : 1.0) x evems_limit_a : unmanaged_sum   [A]
freed_headroom = unmanaged_sum - managed_demand                              [A]
```

**Pinned worked example (four 40 A chargers, EVEMS limiting the aggregate to 80 A).** Without management the service
would need `1.25 x 40 x 4 = ` **200 A** just for the chargers -- a full service upgrade for most homes and many small
sites. With a listed EVEMS holding the total to 80 A, the managed demand is `1.25 x 80 = ` **100 A**, freeing
`200 - 100 = ` **100 A** of headroom, so the four chargers can be fed from a panel that could never have carried their
sum. **Cross-check (no EVEMS means the full sum).** Remove the EVEMS: the demand reverts to the un-managed
`200 A`, and the site must upsize the service -- the exact cost the load-management system avoids. The tile returns the
un-managed sum, the managed demand, and the freed headroom.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`NEC`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the EVEMS example + the no-management cross-check);
`test/fixtures/compute-map.js` (`ev-load-management-ems` -> `computeEvLoadManagementEms` in `../../calc-feeder.js`);
`scripts/related-tiles.mjs` (-> `ev-charger-load` / `existing-load-220-87` / `ev-charge-time`);
`data/search/aliases.json` ("evems", "ev load management", "625.42", "diversified ev load", "energy management ev
charging", "ev demand factor", "aggregate charging limit", "ev service upgrade avoid"); the id appended to the feeder
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the un-managed sum, the managed demand at the EVEMS limit, the 2026 setpoint factor, the
freed headroom, and the error seams (non-finite, count < 1, non-positive rating / limit). Hand-writes its renderer
(mirroring the calc-feeder.js `ev-charger-load` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the sum / managed / headroom stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the EVEMS example -> 200 A sum, 100 A managed, 100 A freed).

## 5. Roadmap position

Adds the load-managed EV demand beside `ev-charger-load` (the single-charger sizing) and `existing-load-220-87` (the
metered-demand path to the same upgrade question). A per-charger throttled-current schedule and a demand-charge-savings
tie-in are deliberate future follow-ons. Further Group A growth stays evidence-driven.
