# roughlogic.com Specification v279 -- Dwelling Service/Feeder Conductor at 83% (NEC 310.12) (calc-service.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v278..v280 (the NEC conductor-and-overcurrent-sizing trio --
> motor overload (v278), the dwelling service conductor at 83% (this spec), the continuous-load device at 125% (v280)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog computes the dwelling service load in amps
> (`service-load-standard`, `service-load-optional`, `service-load`) but stops at the load; it does not size the service-
> entrance conductor that carries it. NEC 310.12 lets a single-phase, 120/240 V dwelling service (and the main feeder
> supplying the entire dwelling load) use conductors rated for only 83% of the service rating, a long-standing allowance
> that makes a 200 A service run on 2/0 copper instead of the 3/0 a straight 310.16 lookup would demand. Adds one tile to
> the existing **`calc-service.js`** module (Group A); no new group, trade, or dependency. Inherits spec.md through
> spec-v278.md.
>
> **The gap, and the evidence for it.** Per NEC 310.12(A), for a one-family dwelling (and the individual dwelling unit of a
> two-family or multifamily dwelling) served by a single-phase, 120/240 V system, the ungrounded service-entrance conductors
> are permitted to have an ampacity not less than 83% of the service rating; the same 83% applies by 310.12(B) to the main
> power feeder. The required conductor ampacity is `A_req = 0.83 * service_A`, and the conductor is then chosen from the
> Table 310.16 75 degC column. For a 200 A copper service, `A_req = 0.83 * 200 = 166 A`, which a 2/0 copper conductor
> (175 A at 75 degC) satisfies -- exactly the size NEC Table 310.12 tabulates for a 200 A dwelling service, and a full trade
> size smaller than the 3/0 (200 A) a non-dwelling 200 A feeder would require. `service-load-standard` produces the service
> amperage; this tile turns that amperage into the service-entrance conductor.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The service rating
`service_A` and the required and conductor ampacities are currents (A); the conductor material selects the Table 310.16
75 degC ampacity set (copper or aluminum); the chosen conductor is a labeled size (AWG/kcmil, a categorical output). The
v18/v21 contract: any non-finite input, a service rating at or below zero, or a service larger than the tabulated set can
carry returns `{ error }` (or a documented ceiling). Citation discipline (v19/v22): `GOVERNANCE.general` over the NEC 310.12
dwelling allowance by name; `editionNote` names **the NEC 2023 310.12(A)/(B) 83% dwelling service/feeder allowance --
`A_req = 0.83 * service_A`, conductor selected from Table 310.16 at 75 degC -- and that Table 310.12 tabulates the common
results directly (100 A -> #4 Cu, 200 A -> 2/0 Cu, 400 A -> 400 kcmil Cu)**, and states that **this applies only to a
single-phase, 120/240 V dwelling service or the main feeder carrying the entire dwelling load, uses the 75 degC termination
column (the common service-equipment rating), and does not apply the ambient or more-than-three-conductor adjustments
(`ambient-ampacity-adjust`), the 110.14(C) termination limit beyond 75 degC, the grounded-conductor/neutral sizing (250.24,
220.61), or non-dwelling feeders; and this is a design aid, not a substitute for the installing electrician and the AHJ** --
the authority having jurisdiction governs.

## 2. The tile

### 2.1 `service-conductor-sizing` -- Dwelling Service/Feeder Conductor at 83% (NEC 310.12)

```
inputs:
  service_A   A       service (or main-feeder) rating, e.g. 100/150/200/400
  material    -       conductor material: copper | aluminum

A_req = 0.83 * service_A                 ; required conductor ampacity, A
                                         ; select smallest Table 310.16 75 degC conductor with ampacity >= A_req
                                         ; (implement the ampacity set as an ORDERED list, smallest first)
size  = smallest size s such that amp75(material, s) >= A_req
```

Copper 75 degC set (A): #4=85, #3=100, #2=115, #1=130, 1/0=150, 2/0=175, 3/0=200, 4/0=230, 250=255, 300=285, 350=310,
400=335. Aluminum 75 degC set (A): #2=100, #1=115, 1/0=135, 2/0=150, 3/0=175, 4/0=205, 250=230, 300=255, 350=280, 400=305.

**Pinned worked example (a 200 A copper dwelling service).** `service_A = 200`, `material = copper`:
`A_req = 0.83 * 200 = 166 A`; the smallest copper 75 degC conductor at or above 166 A is 2/0 (175 A) -- matching NEC Table
310.12's tabulated 2/0 copper for a 200 A dwelling service, and one size below the 3/0 a non-dwelling 200 A feeder needs.
**Cross-check (a 100 A copper service).** `service_A = 100`: `A_req = 0.83 * 100 = 83 A`; the smallest copper conductor at or
above 83 A is #4 (85 A) -- again matching Table 310.12's #4 copper for a 100 A dwelling service. The non-finite,
`service_A <= 0`, and over-range error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, matching the `service-load-*` tiles); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the NEC 310.12 dwelling allowance, `editionNote` naming
`A_req = 0.83 * service_A`, the 75 degC selection, the tabulated 100/200/400 results, and the single-phase-dwelling,
no-adjustment, AHJ caveats); `test/fixtures/worked-examples.json` (the 200 A copper example + the 100 A cross-check);
`test/fixtures/compute-map.js` (`service-conductor-sizing` -> `computeServiceConductorSizing` in `../../calc-service.js`);
`scripts/related-tiles.mjs` (-> `service-load-standard` / `service-load-optional` / `ambient-ampacity-adjust` /
`wire-ampacity`); `data/search/aliases.json` ("service conductor size", "service entrance conductor", "NEC 310.12", "83
percent rule", "dwelling service wire size", "200 amp service wire", "what size wire for 200 amp service", "main feeder
conductor", "service wire sizing"); the id appended to the existing service renderers block in `app.js`; the `// dims:`
annotation (`service_A`/`A_req` current, `size` categorical, `material` categorical); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both copper examples, the ordered-list selection (see the wiring note), and the
`service_A <= 0` / non-finite / over-range error seams. **Wiring note: implement the ampacity set as an ordered array of
`[size, ampacity]` pairs, not a plain object -- JavaScript reorders integer-like keys ("250", "300") ahead of string keys,
which would break the smallest-first scan.** No new module; re-pin `calc-service.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the 200 A -> 2/0 and 100 A -> #4 assertions against Table 310.12);
`npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the
`A_req` and selected `size` with the material note wrap on a phone); render-no-nan + a11y sweep, output read to the value
(200 A copper -> 166 A -> 2/0 Cu).

## 5. Roadmap position

Middle of the NEC conductor-and-overcurrent-sizing batch (v278..v280) in `calc-service.js`: the service load
(`service-load-standard`) now has a service-entrance conductor. The continuous-load breaker and conductor at 125%
(210.20/215.3) is v280. Aluminum-versus-copper Table 310.12 tabulation, the grounded-conductor/neutral at 220.61, and the
ambient/fill adjustment chained from `ambient-ampacity-adjust` are the deliberate next follow-ons once the trio lands.
