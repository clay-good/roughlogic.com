# roughlogic.com Specification v611 -- EV Charger Throttled-Current Schedule (calc-feeder.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-feeder.js`**
> (Group A, the electrical feeder / NEC bench); no new module, group, or dependency. Inherits spec.md through
> spec-v610.md.
>
> **The gap, and the evidence for it.** Spec-v561 (`ev-load-management-ems`) names this tile as a deliberate follow-on:
> "a per-charger throttled-current schedule." The EVEMS tile sizes the service demand a listed energy-management system
> lets you get away with; it never says what each car actually receives when the system is throttling. That is the
> number a fleet operator and an installer both ask: when more chargers are plugged in than the aggregate limit can
> feed at full rate, the EVEMS shares the budget, so each active charger is held to `aggregate_limit / active_chargers`
> (never above its own maximum). Four 40-amp chargers on a 100-amp EVEMS budget do not each get 40 amps -- the system
> throttles all four to **25 amps**, and only **two** could run at full rate at once. Drop to two active chargers and
> the same budget lets both charge at their full 40 amps. The tile computes the per-charger throttled current, the
> number that can run at full rate simultaneously, and whether the current mix fits without throttling, so an operator
> can predict charge times and an installer can explain to a customer why the last car in slows the rest down.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The aggregate limit, the
per-charger maximum, and the throttled current are `I` (A); the charger counts are `dimensionless`. The v18/v21
contract: any non-finite input, a non-positive aggregate limit or per-charger maximum, or an active-charger count below
1 returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.electrical` over the NEC 625.42(A) energy-management
throttling by name (matching the `ev-load-management-ems` sibling), `editionNote` the standard NEC disclosure; the
citation prints `throttled_a = min(charger_max_a, aggregate_limit_a / active_chargers)`,
`full_rate_count = floor(aggregate_limit_a / charger_max_a)`, and
`all_full = active_chargers x charger_max_a <= aggregate_limit_a`, and states that **the EVEMS shares the aggregate
limit equally among the active chargers (never above a charger's own maximum), a listed and hardware-enforced EVEMS is
what permits the sharing, the schedule is the equal-share case (priority or round-robin schemes differ), and the NEC
and the AHJ govern** -- a planning aid, not the EVEMS configuration.

## 2. The tile

### 2.1 `ev-charger-throttle` -- Per-Charger Current Under an EVEMS Budget

```
inputs:
  aggregate_limit_a   A     EVEMS aggregate current budget for the charger group
  charger_max_a       A     each charger's maximum current
  active_chargers     count  chargers drawing at once (>= 1)

throttled_a      = min(charger_max_a, aggregate_limit_a / active_chargers)   [A]
full_rate_count  = floor(aggregate_limit_a / charger_max_a)                   [chargers]
all_full         = active_chargers x charger_max_a <= aggregate_limit_a       [bool]
```

**Pinned worked example (a 100-amp EVEMS budget, four 40-amp chargers, all four active).**
`4 x 40 = 160 A > 100 A`, so the system throttles: `throttled = min(40, 100/4) = ` **25 A** to each car, and only
`floor(100/40) = ` **2** chargers could run at full 40 A at once -- the reason the third and fourth cars slow all of
them down. **Cross-check (only two of the four active).** `2 x 40 = 80 A <= 100 A`, so
`throttled = min(40, 100/2) = min(40, 50) = ` **40 A** -- both charge at their full rate with 20 A of budget to
spare, `all_full = true`, no throttling. Same hardware, a different answer with fewer cars plugged in.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.electrical`, `editionNote` NEC disclosure per §1); `test/fixtures/worked-examples.json` (both examples);
`test/fixtures/compute-map.js` (`ev-charger-throttle` -> `computeEvChargerThrottle` in `../../calc-feeder.js`);
`scripts/related-tiles.mjs` (-> `ev-load-management-ems` / `ev-charger-load` / `existing-load-220-87`);
`data/search/aliases.json` ("ev charger throttle", "evems throttle", "charger current sharing", "throttled charging
current", "ev load share", plus question rows); the id appended to the calc-feeder declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the throttle-equals-min behavior, the all-full case, and the error seams (non-finite,
non-positive limit / max, active < 1). Renderer uses the module's `_v26*` helpers (mirroring `ev-load-management-ems`).
Group A has no exact per-group audit count (`> 20`), so no count bump. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**, `check-citation-coverage`
CF-01 satisfied by the NEC disclosure); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(the four-active example -> 25 A each).

## 5. Roadmap position

Gives `ev-load-management-ems` the operating-side schedule its follow-on named, beside `ev-charger-load` and
`existing-load-220-87`. The v561-named demand-charge-savings tie-in remains a deliberate future follow-on. Further
Group A growth stays evidence-driven.
