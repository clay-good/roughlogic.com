# roughlogic.com Specification v171 -- Conductor Short-Circuit Withstand / Minimum Size (ICEA P-32-382) (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: CUT 2026-06-24 (duplicate of an existing tile). Batch spec-v164..v178 (electrician trade).** During the
> v164..v178 landing pass the catalog was found to ALREADY contain `conductor-short-circuit-withstand` ("Conductor
> Short-Circuit Thermal Withstand (Onderdonk / ICEA)", `computeConductorShortCircuitWithstand` in calc-electrical.js),
> which implements exactly this adiabatic withstand: (I/A)^2 t = K log10[(Tf+B)/(Ti+B)] with copper K=0.0297 B=234,
> aluminum K=0.0125 B=228, and already returns `min_cmil = fault x sqrt(t / C)` -- the same minimum-area answer this
> proposal computes. The proposed `conductor-withstand` is the same calculation under a different id, so it is cut
> rather than shipped as a duplicate. Original proposal preserved below for the audit trail.
>
> **Status (superseded): PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile computing the minimum conductor size that
> can survive a short-circuit for a given clearing time, using the ICEA P-32-382 adiabatic
> (Onderdonk-form) withstand equation. Adds one tile to **`calc-elecdesign.js`** (Group A); no new
> module, group, or dependency. Inherits spec.md through spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog computes available fault current
> (`short-circuit-pp`) but never the *thermal* question that pairs with it: can the conductor itself
> survive that current for the time the OCPD takes to clear, before the insulation cooks. The ICEA
> withstand equation answers it and sets a minimum circular-mil area. Feeder and equipment-ground
> conductors on high-fault services are routinely checked against it, and the catalog has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
fault current is `I`, the clearing time is `time` (s), the initial and final conductor temperatures
are `temperature` (deg-C), and the result is a circular-mil `area`. The copper constant 0.0297 (and
the aluminum 0.0125) carries the material/specific-heat basis of the ICEA relation. The v18/v21
contract: any non-finite input, a non-positive fault current, a non-positive time, or a final
temperature at or below the initial returns `{ error }`; the log-ratio denominator is guarded positive
by that final>initial check. Citation discipline (v19/v22): `GOVERNANCE.electrical`, edition `ICEA
P-32-382 / IEEE 242 conductor short-circuit withstand (adiabatic)`, `editionNote` `NEC_DISCLOSURE`,
with the note that the result is a minimum area rounded **up** to a standard size, that 250.122 already
sets a minimum EGC independent of this, and that the engineer and the equipment short-circuit-current
rating govern.

## 2. The tile

### 2.1 `conductor-withstand` -- Minimum Conductor Circular Mils for a Fault

```
inputs:
  fault_a       I            symmetrical fault current through the conductor
  clear_s       time         total OCPD clearing time (s)
  t_initial_c   temperature  conductor temperature before the fault (deg-C, e.g. 75)
  t_final_c     temperature  max allowable conductor temperature (deg-C, e.g. 250 for thermoset)
  material      dimensionless  copper -> K = 0.0297, aluminum -> K = 0.0125

# ICEA: (fault_a / area_cmil)^2 x clear_s = K x log10[(t_final_c + 234) / (t_initial_c + 234)]
denom        = K x log10((t_final_c + 234) / (t_initial_c + 234))      # 234 = inferred zero-resist (Cu)
area_cmil    = fault_a x sqrt(clear_s) / sqrt(denom)
verdict: select the next standard conductor with area >= area_cmil
```

**Pinned worked example.** Copper, 10,000 A fault, 0.05 s (3-cycle) clearing, from 75 deg-C to a
250 deg-C thermoset limit: `log10((250+234)/(75+234)) = log10(484/309) = log10(1.566) = 0.1948`;
`denom = 0.0297 x 0.1948 = 0.005786`; `sqrt(denom) = 0.07607`;
`area = 10,000 x sqrt(0.05) / 0.07607 = 10,000 x 0.2236 / 0.07607 = 29,395 cmil`. The next standard
size at or above 29,395 cmil is **#4 Cu (41,740 cmil)** -- a #6 would clear the *load* but not the
*fault withstand*. **Cross-check (faster clearing).** The same fault cleared in 0.0167 s (1 cycle):
`area = 10,000 x sqrt(0.0167) / 0.07607 = 10,000 x 0.1292 / 0.07607 = 16,985 cmil` -> next size **#6
Cu (26,240 cmil)**. Faster clearing permits a smaller minimum. The engineer governs.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, ICEA P-32-382 / IEEE 242, the adiabatic equation and
the copper/aluminum constants listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`conductor-withstand` -> `computeConductorWithstand` in `../../calc-elecdesign.js`);
`scripts/related-tiles.mjs` (-> `short-circuit-pp` / `egc-sizing` / `wire-ampacity`);
`data/search/aliases.json` ("conductor withstand", "short circuit withstand", "I squared t", "ICEA",
"fault withstand", "minimum conductor for fault"); the id appended to the existing
`ELECDESIGN_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both clearing-time examples, the aluminum
constant, and error seams (non-finite, fault <= 0, time <= 0, t_final <= t_initial). Raise the
`calc-elecdesign.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the aluminum path, the t_final<=t_initial
seam); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the log term, the area, and the selected size wrap on a phone); render-no-nan +
a11y sweep, output read to the value (10 kA / 0.05 s / 75->250 -> 29,395 cmil -> #4; 0.0167 s ->
16,985 cmil -> #6).

## 5. Roadmap position

Pairs the thermal withstand with the available-fault tile (`short-circuit-pp`) to close the
short-circuit story. Further Group A growth stays evidence-driven.
