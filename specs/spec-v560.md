# roughlogic.com Specification v560 -- Industrial Control Panel SCCR (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v559.md.
>
> **The gap, and the evidence for it.** An industrial control panel must carry a short-circuit current rating (SCCR)
> that is at least the available fault current at its terminals -- NEC 409.110 and 110.10 require it -- and the bench has
> no tile for it. The catch that fails inspections is the **weakest-link** rule: under UL 508A Supplement SB, the panel
> SCCR is the **lowest** of its power-circuit components' individual ratings (and the feeder overcurrent device's
> interrupting rating), not the rating of the main breaker. One 5 kA-rated contactor or overload relay caps the entire
> panel at 5 kA, no matter how robust the main is. A current-limiting fuse ahead of a weak component can raise the
> combination's rating through its let-through, which is the standard fix. The tile takes the component SCCRs and the
> available fault current, and returns the panel SCCR (the minimum) and whether it clears the fault -- the compliance
> check a panel builder must pass.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The component SCCRs, the
panel SCCR, and the available fault current are currents (`I`, in kA); the count of components is `dimensionless`. The
v18/v21 contract: any non-finite input, an empty component list, a non-positive component rating, or a negative
available fault current returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the SCCR
determination by name (UL 508A Supplement SB; NEC 409.110 / 110.10); `editionNote` names the **UL 508A panel SCCR
(weakest-link method)**, prints `panel_sccr = min(component SCCRs, feeder OCPD interrupting rating)` and the pass test
`panel_sccr >= available_fault`, and states that **the panel rating is the lowest-rated power-circuit component not the
main device (one 5 kA contactor caps the panel), the feeder overcurrent device's interrupting rating also bounds it, a
current-limiting fuse or breaker ahead of a weak component can raise the combination rating through its let-through
energy (a listed combination), NEC 409.110 requires the SCCR to be marked and to meet or exceed the available fault,
and UL 508A and the AHJ govern** -- a compliance aid, not the AHJ.

## 2. The tile

### 2.1 `sccr-combination` -- Why One 5 kA Component Caps the Whole Panel

```
inputs:
  component_sccrs_ka  [kA]  list of the power-circuit components' individual SCCRs
  feeder_ir_ka        kA    interrupting rating of the feeder overcurrent device (0 to omit)
  available_fault_ka  kA    available fault current at the panel terminals

candidates = component_sccrs_ka + (feeder_ir_ka > 0 ? [feeder_ir_ka] : [])
panel_sccr = min(candidates)                                             [kA]
compliant  = panel_sccr >= available_fault_ka
```

**Pinned worked example (a panel with a 65 kA main breaker, a 5 kA contactor, a 5 kA overload relay, and 10 kA terminal
blocks; 22 kA available fault).** The panel SCCR is the minimum of the components: `min(65, 5, 5, 10) = ` **5 kA** --
the two 5 kA devices cap it, and the 65 kA main is irrelevant. Against the `22 kA` available fault, `5 < 22`, so the
panel is **non-compliant** and would fail inspection under 409.110. **Cross-check (a current-limiting fuse rescues the
weak component).** Add a listed current-limiting fuse ahead of the 5 kA devices whose let-through qualifies the
combination for 65 kA: the two 5 kA components no longer govern, so the panel SCCR rises to the next weakest, the
`10 kA` terminal blocks -- still `10 < 22`, so those must be upgraded too before the panel clears the 22 kA fault. The
tile returns the panel SCCR and the pass/fail against the available fault.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the weakest-link example + the
current-limiting-fuse cross-check); `test/fixtures/compute-map.js` (`sccr-combination` -> `computeSccrCombination` in
`../../calc-elecdesign.js`); `scripts/related-tiles.mjs` (-> `short-circuit-pp` / `breaker-sizing` /
`asymmetrical-fault-xr`); `data/search/aliases.json` ("sccr", "short circuit current rating", "ul 508a", "control panel
sccr", "weakest link sccr", "409.110", "available fault current", "current limiting fuse sccr"); the id appended to the
elecdesign renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the min-of-components rating, the feeder-IR bound, the pass/fail
against the fault, and the error seams (non-finite, empty list, non-positive component, negative fault). Hand-writes its
renderer (mirroring the calc-elecdesign.js `short-circuit-pp` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the panel-SCCR / compliant stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the base example -> 5 kA panel SCCR, non-compliant).

## 5. Roadmap position

Adds the panel SCCR compliance check beside `short-circuit-pp` (which gives the available fault it is checked against)
and `breaker-sizing`. A current-limiting-fuse let-through combination-rating helper and a per-component minimum-rating
solver (the SCCR each device needs to clear a target fault) are deliberate future follow-ons. Further Group A growth
stays evidence-driven.
