# roughlogic.com Specification v113 -- Guard and Handrail Code Check (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED 2026-06-20 (package 0.70.0, catalog 676 -> 687 across spec-v112..v119).** In-scope catalog expansion under
> the spec-v106 charter: one Tier-1 carpentry / GC tile that checks measured guard and handrail
> dimensions against the IRC code minimums, AHJ governed, redo-not-harm. Adds one tile to
> **`calc-construction.js`** (Group E); no new module, group, or dependency. Inherits spec.md
> through spec-v112.md.
>
> **The gap, and the evidence for it.** The catalog has deck, stair, and ledger code-check tiles
> (`Deck Beam and Post Sizing`, `Stair Stringer Layout (with code check)`, `Deck Ledger Fastener
> Spacing`) and a general `Equal Spacing Layout` that can solve the 4-inch-sphere baluster gap, but
> no tile that answers the inspector's guard questions directly: is a guard required here, is it
> tall enough, is the infill tight enough, and is the handrail at a legal height. This is a daily
> deck / stair / GC check.
>
> **Scope note (spec-v106).** This is a dimensional code *check*, not a structural design: the
> 200-lb concentrated guard load (IRC R301.5) is a structural item governed by the AHJ and is
> stated as a reference note, not computed. The tile checks heights and infill geometry only.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. All
inputs and the bundled minimums are lengths (`L`); the outputs are pass/fail flags
(dimensionless) plus the required value for each failing dimension. Bundled minimums (guard 36 in
residential / 42 in commercial, infill 4-in sphere / 4-3/8-in stair-triangle, handrail 34 to 38
in, the 30-in guard-required trigger) are annotated editable fields, because the AHJ-adopted
edition governs. The v18/v21 contract: any non-finite or negative dimension returns `{ error }`.
Citation discipline (v19/v22): cites **IRC R312 (guards) and R311.7.8 (handrails)** by section
without reproducing the code text; "the AHJ-adopted edition governs"; the IRC is free to read at
the ICC public-access library.

## 2. The tile

### 2.1 `guard-handrail-check` -- Guard and Handrail Code Check (IRC R312 / R311.7.8)

```
inputs:
  occupancy             dimensionless  residential (IRC) / commercial (IBC)
  surface_height_in     L              walking-surface height above the grade/floor below
  measured_guard_in     L              measured guard height
  measured_infill_gap_in L             largest opening / baluster clear gap
  at_stairs             dimensionless  is this run on a stair (changes infill allowance)
  measured_handrail_in  L              measured handrail height (stairs)

guard_required = surface_height_in > 30
min_guard = (occupancy = commercial) ? 42 : 36
max_infill = at_stairs ? 4.375 : 4.0           # 4-3/8 in stair triangle, else 4-in sphere
flags:
  guard height   ok if not guard_required or measured_guard_in >= min_guard
  infill         ok if measured_infill_gap_in <= max_infill
  handrail (stairs) ok if 34 <= measured_handrail_in <= 38
load note (always): "guards/handrails must also resist a 200 lb concentrated load per IRC R301.5; the AHJ governs."
```

**Pinned worked example.** Residential deck 48 in above grade, guard 36 in, infill gap 3.5 in,
handrail 36 in: guard required (48 > 30), height ok (36 >= 36), infill ok (3.5 <= 4.0), handrail ok
(34 to 38) -> all pass. **Cross-check:** same deck with a 34-in guard and a 4.5-in infill gap ->
guard height fails (needs 36), infill fails (needs <= 4.0); the load note always renders.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["carpentry"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (IRC R312 / R311.7.8 by section, ICC public-access note); worked-examples
fixtures (example + cross-check); `compute-map.js` (`guard-handrail-check` ->
`computeGuardHandrailCheck` in `../../calc-construction.js`); `related-tiles.mjs` (->
`stair-stringer-layout` / `deck-beam-post-sizing` / `equal-spacing-layout`);
`data/search/aliases.json` ("guard rail height", "guardrail code", "baluster gap", "handrail
height", "4 inch sphere", "R312"); the id appended to the existing `CONSTRUCTION_RENDERERS`
declare in `app.js`; the `// dims:` annotation; regenerated corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning the example, cross-check, and error seams. Raise the
`calc-construction.js` size cap by ~20 percent if needed; bump the `citations.js` cap if needed.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` +1 tile);
`npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `data:verify`; worked-examples runner; 320 px audit (the per-dimension flag lines wrap,
not scroll); render-no-nan + a11y sweep, output read to the value (48 in / 36 in guard / 3.5 in
gap -> all pass; 34 in guard -> fail).

## 5. Roadmap position

Adds the guard/handrail check to the deck-and-stair code-check family; a prime beneficiary of the
jurisdiction / edition-awareness pillar (spec-v106 §7), since the minimums vary by adopted edition
and IRC-vs-IBC occupancy. Further Group E growth stays evidence-driven.
