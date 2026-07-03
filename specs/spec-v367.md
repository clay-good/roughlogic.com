# roughlogic.com Specification v367 -- Egress Lighting Illuminance Compliance Check (NFPA 101 / IBC) (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v365..v367 (the lighting-design trio -- light-loss factor
> (v365), uniformity ratio (v366), the egress-lighting compliance check (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog designs general lighting, but the means-
> of-egress lighting has hard code minimums -- an average and a minimum illuminance on the egress floor, and a maximum-to-
> minimum uniformity ratio -- that a designer and an inspector check against NFPA 101 / IBC. The catalog has no egress-
> lighting compliance tile. Adds one tile to the existing **`calc-elecdesign.js`** module (Group A); no new group, trade, or
> dependency. Inherits spec.md through spec-v366.md.
>
> **The gap, and the evidence for it.** NFPA 101 (7.8) and the IBC set the means-of-egress illumination at not less than
> 1.0 footcandle (10.8 lux) average and 0.1 footcandle (1.1 lux) minimum at the walking surface, with a maximum-to-minimum
> uniformity ratio no greater than 40 to 1 (and, for emergency egress during the 90-minute battery duration, a decline to
> not less than 0.6 fc average / 0.06 fc minimum is permitted). For a corridor reading 1.2 fc average, 0.15 fc minimum, and
> 3.0 fc maximum, the average clears 1.0, the minimum clears 0.1, and the `max/min = 20` clears 40:1 -- a pass. Miss any one
> -- a dark spot below 0.1 fc, or a 50:1 hot-to-dark ratio -- and the egress path fails inspection. This is the life-safety
> check the general-lighting tiles never make.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The average, minimum, and
maximum egress illuminances are illuminances (footcandles); the maximum-to-minimum ratio is dimensionless; the mode
(normal vs 90-minute emergency end) selects the threshold set. The v18/v21 contract: any non-finite input, or a minimum at
or below zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the egress-illumination
requirements by name; `editionNote` names **the NFPA 101 §7.8 / IBC means-of-egress illumination -- not less than 1.0 fc
average and 0.1 fc minimum at the walking surface, `max/min <= 40:1`, and the emergency-lighting decline permitted to 0.6 fc
average / 0.06 fc minimum at the end of the 90-minute duration**, and states that **this returns the pass/fail against the
egress-illumination minimums for the selected condition -- it checks the entered measured/calculated values against the
code thresholds (the specific adopted code and edition, and any occupancy-specific requirement, govern; verify the exact
numbers), and does not design the emergency lighting, size the battery/inverter (`standby-battery-sizing`), or lay out the
fixtures; and this is a compliance-screen aid, not a substitute for the AHJ** -- the adopted code and the authority having
jurisdiction govern.

## 2. The tile

### 2.1 `egress-lighting-check` -- Egress Lighting Illuminance Compliance Check

```
inputs:
  avg_fc   fc    average illuminance on the egress path
  min_fc   fc    minimum illuminance
  max_fc   fc    maximum illuminance
  mode     -     normal | emergency-90min-end

thresholds: normal -> avg>=1.0, min>=0.1 ; emergency-end -> avg>=0.6, min>=0.06
max_min = max_fc / min_fc
pass = (avg_fc >= avg_thr) AND (min_fc >= min_thr) AND (max_min <= 40)
```

**Pinned worked example (a corridor: 1.2 fc avg, 0.15 fc min, 3.0 fc max, normal).** average `1.2 >= 1.0` (pass),
minimum `0.15 >= 0.1` (pass), `max/min = 3.0/0.15 = 20 <= 40` (pass) -> **compliant**. **Cross-check (a dark spot at the
90-minute emergency end).** Readings decline to 0.7 fc avg, 0.05 fc min, 2.5 fc max in emergency mode: average
`0.7 >= 0.6` (pass), but minimum `0.05 < 0.06` (**fail**), so the path fails the emergency minimum even though its average
holds -- the single dark spot below the floor that a fixture or a relocation must fix. The non-finite and `min <= 0` error
paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, matching `lumen-method`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the NFPA 101 §7.8 / IBC egress-illumination requirements, `editionNote` naming
the 1.0/0.1 fc normal and 0.6/0.06 fc emergency-end minimums and the 40:1 ratio, and the verify-adopted-code, screen-only,
AHJ-governs caveats); `test/fixtures/worked-examples.json` (the compliant example + the emergency-fail cross-check);
`test/fixtures/compute-map.js` (`egress-lighting-check` -> `computeEgressLightingCheck` in `../../calc-elecdesign.js`);
`scripts/related-tiles.mjs` (-> `lumen-method` / `lighting-uniformity-ratio` / `standby-battery-sizing` /
`egress-capacity`); `data/search/aliases.json` ("egress lighting", "means of egress illumination", "emergency lighting fc",
"1 footcandle egress", "NFPA 101 lighting", "egress lighting check", "0.1 footcandle minimum", "40 to 1 ratio", "exit
lighting level"); the id appended to the existing elecdesign renderers block in `app.js`; the `// dims:` annotation
(illuminances illuminance, `max/min` dimensionless); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the normal/emergency threshold sets, the 40:1 ratio, and the `min <= 0` / non-finite error seams. No
new module; re-pin `calc-elecdesign.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the threshold-set assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the avg/min/max checks and pass/fail
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (1.2/0.15/3.0 normal -> pass).

## 5. Roadmap position

Closes the lighting-design batch (v365..v367) in `calc-elecdesign.js`: the light-loss factor, uniformity ratio, and egress
compliance now round out the lighting tiles beside the lumen-method and point-illuminance tools. An occupancy-specific
threshold library, a 90-minute battery-duration chain into `standby-battery-sizing`, and an exit-sign/photoluminescent
variant are the deliberate next follow-ons once the trio lands.
