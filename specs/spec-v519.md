# roughlogic.com Specification v519 -- Existing-Facility Load by Peak Demand (calc-feeder.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-feeder.js`**
> (Group A, the feeder / service bench); no new module, group, or dependency. Inherits spec.md through spec-v518.md.
>
> **The gap, and the evidence for it.** The bench has the standard and optional service-load calculations
> (`service-load-standard`, `service-load-optional`), which add up nameplate loads and can badly overstate what a
> service actually carries. NEC 220.87 offers a different, evidence-based path for an **existing** building: instead of
> summing connected loads, take the maximum demand the utility actually metered over the last year (or a 30-day
> recording) and add 125% of it to the new load. This is the tile that tells a contractor whether an EV charger or a
> heat pump can be added **without a costly service upgrade**, because a building rarely runs near its connected total.
> The catch is in the basis and the conditions: the multiplier is 125% of the **metered demand**, it needs a year of
> data (or a 30-day recording under 220.87), and it is **void** if the recorded data already reflects solar or a
> peak-shaving system that would mask the true peak. The tile takes the recorded peak, the new load, and the service
> rating, and returns the 220.87 total and the headroom, with the data-condition caveats.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The recorded peak, new
load, computed total, service rating, and headroom are currents (`I`, in amps); the 1.25 multiplier is `dimensionless`.
The v18/v21 contract: any non-finite input, a non-positive recorded peak, a negative new load, or a non-positive service
rating returns `{ error }`; a `pv_or_peakshave` flag set true returns a result annotated that 220.87 does not apply.
Citation discipline (v19/v22): `NEC` over 220.87; `editionNote` names **NEC 2023 220.87 (determining existing loads)**,
prints `basis = 1.25 x recorded_peak`, `total = basis + new_load`, and `headroom = service_rating - total`, and states
that **the basis is 125% of the maximum demand the utility metered not the sum of connected loads, the data must span at
least a year (or a 30-day recording per 220.87 conditions), the method is void where the recorded demand already
reflects on-site generation or a peak-shaving system that hides the true peak, and the AHJ and the utility data govern**
-- a design aid, not the engineer of record.

## 2. The tile

### 2.1 `existing-load-220-87` -- Adding Load Without a Service Upgrade, on the Metered Peak

```
inputs:
  recorded_peak_a    A     maximum demand metered over the last year (or a 30-day recording)
  new_load_a         A     the continuous-equivalent new load to add (e.g. an EVSE)
  service_rating_a   A     the existing service ampere rating
  pv_or_peakshave    bool  does the recorded data reflect on-site PV or peak-shaving? (voids 220.87)

basis    = 1.25 x recorded_peak_a               [A]
total    = basis + new_load_a                   [A]
headroom = service_rating_a - total             [A]
fits     = headroom >= 0 and not pv_or_peakshave
```

**Pinned worked example (a 200 A service, 120 A recorded peak, adding a 40 A EVSE).**
`basis = 1.25 x 120 = 150 A`; `total = 150 + 40 = ` **190 A**; `headroom = 200 - 190 = ` **10 A** -- it fits under the
200 A service, so the EVSE goes in with no upgrade, exactly the outcome 220.87 exists to enable. **Cross-check (a busier
building has no room).** The same service with a 145 A recorded peak: `basis = 1.25 x 145 = 181.25 A`,
`total = 181.25 + 40 = ` **221.25 A**, `headroom = 200 - 221.25 = ` **-21.25 A** -- over the service, so this building
does need an upgrade or a load-management strategy. The tile returns the 125% basis, the total, and the headroom, with
the PV/peak-shave caveat.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`NEC`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the fits example + the needs-upgrade cross-check);
`test/fixtures/compute-map.js` (`existing-load-220-87` -> `computeExistingLoad22087` in `../../calc-feeder.js`);
`scripts/related-tiles.mjs` (-> `service-load-optional` / `service-load-standard` / `ev-charger-load`);
`data/search/aliases.json` ("220.87", "existing load calculation", "metered peak demand", "add ev charger service",
"service upgrade avoid", "maximum demand method", "125 percent demand", "existing dwelling load"); the id appended to
the feeder renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the 1.25 basis, the headroom sign flip, the PV/peak-shave void
flag, and the error seams (non-finite, non-positive peak / service, negative new load). Hand-writes its renderer
(mirroring the calc-feeder.js `service-load-optional` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the basis / total / headroom stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the fits example -> 190 A total, 10 A headroom).

## 5. Roadmap position

Adds the metered-demand path beside the connected-load `service-load-standard` and `service-load-optional`, and is the
natural upstream of `ev-charger-load` (can the EVSE be added). A 30-day-recording helper and an EVEMS load-management
tie-in (when the metered method still comes up short) are deliberate future follow-ons. Further Group A growth stays
evidence-driven.
