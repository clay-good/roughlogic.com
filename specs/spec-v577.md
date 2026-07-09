# roughlogic.com Specification v577 -- National Fire Academy Quick Fire-Flow (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, fire-ground engineering); no new module, group, or dependency. Inherits spec.md through spec-v576.md.
>
> **The gap, and the evidence for it.** The bench has the ISO area method (`required-fire-flow`) and the ISO PPC NFF
> (`iso-nff`) for water-supply planning, but not the mental **fireground quick-calc** an incident commander runs during
> size-up. The National Fire Academy formula, `NFF = (L x W / 3) x (percent involved / 100)`, gives an offensive-attack
> flow in seconds, plus 25% of the fire flow for each exposure and a multiplier for the number of involved floors. The
> catch is its **validity envelope**: the formula is calibrated only for interior/offensive attack up to about 50%
> involvement and roughly 1,000 gpm. Beyond that it under-predicts badly, and the fight is defensive, where the ISO or
> required-fire-flow method belongs. It is a scene-size-up tool, not a water-supply design. The tile takes the building
> footprint, the percent involved, the exposures, and the involved floors, and returns the needed fire flow with the
> exposure and floor additions, and a flag when the result leaves the formula's valid range.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The length and width are
lengths (`L`, in ft); the fire flow is a volumetric flow (`L^3 T^-1`, in gpm); the percent involved, the number of
exposures and floors, and the 25% factor are `dimensionless`. The v18/v21 contract: any non-finite input, a non-positive
length or width, a percent involved outside `(0, 100]`, or a negative exposure or floor count returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the NFA formula by name (National Fire Academy fire-flow
quick-calc; IFSTA); `editionNote` names the **National Fire Academy fireground fire-flow**, prints
`base = (length x width / 3) x (percent_involved / 100)`, the per-floor multiply by involved floors, and the exposure
addition `0.25 x base per exposure`, and states that **the formula is validated only for interior/offensive attack up to
about 50% involvement and roughly 1,000 gpm -- beyond that it under-predicts badly and the fight is defensive (use the
ISO / required-fire-flow method) -- it is a mental scene-size-up tool not a water-supply design, and incident command
governs** -- a size-up aid, not a water-supply design.

## 2. The tile

### 2.1 `nfa-fireground-flow` -- The Offensive-Attack Quick-Calc (and Where It Stops Being Valid)

```
inputs:
  length_ft          ft   building length
  width_ft           ft   building width
  percent_involved   %    percent of the area involved
  floors_involved    -    number of involved floors (default 1)
  exposures          -    number of exposures to protect

base_gpm      = (length_ft x width_ft / 3) x (percent_involved / 100) x floors_involved   [gpm]
exposure_gpm  = 0.25 x base_gpm x exposures                                               [gpm]
total_gpm     = base_gpm + exposure_gpm                                                    [gpm]
valid         = percent_involved <= 50 and base_gpm <= 1000
```

**Pinned worked example (a 40 by 60 ft building, 50% involved, one floor, two exposures).** The base fire flow is
`(40 x 60 / 3) x 0.50 = 800 x 0.5 = 400 gpm`; two exposures add `0.25 x 400 x 2 = 200 gpm`, for a total of
`400 + 200 = ` **600 gpm** -- a workable offensive flow within the formula's range. **Cross-check (heavy involvement
leaves the valid envelope).** Take the same building at `90%` involvement: `base = 800 x 0.90 = 720 gpm`, but the
`valid` flag drops because involvement exceeds 50% -- the NFA quick-calc no longer applies, the fire is a defensive
operation, and the ISO / required-fire-flow method should size the water supply instead. The tile returns the base flow,
the exposure addition, the total, and the validity flag.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the valid example + the out-of-range
cross-check); `test/fixtures/compute-map.js` (`nfa-fireground-flow` -> `computeNfaFiregroundFlow` in
`../../calc-fire.js`); `scripts/related-tiles.mjs` (-> `required-fire-flow` / `iso-nff` / `pdp`);
`data/search/aliases.json` ("nfa fire flow", "national fire academy formula", "fireground flow", "fire flow quick
calc", "length width divided by 3", "offensive fire flow", "size up fire flow", "exposure fire flow"); the id appended
to the fire renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the base flow, the exposure addition, the floor multiply, the
validity flag, and the error seams (non-finite, non-positive dimensions, percent out of range, negative exposures /
floors). Hand-writes its renderer (mirroring the calc-fire.js `required-fire-flow` pattern). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the base / exposure / total stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the base example -> 400 gpm base, 600 gpm total).

## 5. Roadmap position

Adds the mental fireground quick-calc beside the ISO area methods (`required-fire-flow`, `iso-nff`) and points at them
when its envelope is exceeded. A per-floor breakdown and an Iowa/Royer-Nelson rate-of-flow (volume method) alternative
are deliberate future follow-ons. Further Group F growth stays evidence-driven.
