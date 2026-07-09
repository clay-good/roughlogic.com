# roughlogic.com Specification v567 -- Live Crown Removal Limit (Pruning Dose) (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, agriculture and forestry); no new module, group, or dependency. Inherits spec.md through spec-v566.md.
>
> **The gap, and the evidence for it.** ANSI A300 Part 1 limits how much live foliage a single pruning may remove,
> because a tree makes its food in its leaves and over-pruning starves it. The bench has felling and chipping tiles but
> no pruning-dose check. The catch is that the well-known **25% ceiling is the mature-tree maximum, not a target**, and
> it drops for young, over-mature, or stressed trees -- all the way to **0% for a stressed tree**. A second trap:
> lion's-tailing (stripping the interior foliage and leaving tufts at the branch ends) violates A300 even when the total
> removed is under 25%. The tile takes the live foliage, the proposed removal, and the tree's maturity class, and
> returns the removal percent, the applicable cap, and whether the pruning is within the standard -- so a crew does not
> quietly over-prune a young or struggling tree to the mature-tree limit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The live foliage and
proposed removal are carried in consistent units (ft^2 of foliage or a percent, `dimensionless`); the removal percent
and the cap are `dimensionless`; the maturity class is categorical. The v18/v21 contract: any non-finite input, a non-
positive live foliage, a negative removal, or an unrecognized maturity class returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the pruning-dose limits by name (ANSI A300 Part 1; ISA Best Management Practices);
`editionNote` names the **ANSI A300 live-crown removal limit**, prints `removal_pct = removed / live_foliage x 100` and
the class cap comparison, lists the caps (**mature <= 25% in a single season, young lower, over-mature lower, stressed
0%**), and states that **the 25% ceiling is the mature-tree maximum not a target and drops for young, over-mature, or
stressed trees (0% for stressed), lion's-tailing violates A300 even under the percent cap, removing too much live
foliage starves the tree, and a qualified arborist governs** -- a planning aid, not an arborist's prescription.

## 2. The tile

### 2.1 `crown-pruning-dose` -- The 25% Cap Is the Mature-Tree Maximum, Not a Goal

```
inputs:
  live_foliage      -    estimated live crown/foliage before pruning (ft^2 or %)
  removed_foliage   -    foliage proposed for removal (same units)
  maturity_class    -    young / mature / over-mature / stressed

removal_pct = removed_foliage / live_foliage x 100          [%]
cap_pct     = mature 25 / young 15 / over-mature 10 / stressed 0     [%]
within      = removal_pct <= cap_pct
```

**Pinned worked example (removing 15% of a mature tree's live crown).** The removal is **15%**, and the mature-tree cap
is **25%**, so the pruning is **within** the standard with margin -- a reasonable single-season dose. **Cross-check (the
same dose on a stressed tree is over the limit).** Propose the identical 15% removal on a **stressed** tree: the cap is
**0%**, so the 15% **exceeds** it -- a stressed tree should not have live foliage removed at all until it recovers, the
exact over-pruning the class cap prevents. The tile returns the removal percent, the applicable cap, and the within-
standard flag.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["arborist"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the mature example + the stressed
cross-check); `test/fixtures/compute-map.js` (`crown-pruning-dose` -> `computeCrownPruningDose` in
`../../calc-arborist.js`); `scripts/related-tiles.mjs` (-> `tree-protection-zone` / `trunk-decay-strength` /
`felling-notch-hinge`); `data/search/aliases.json` ("pruning dose", "crown removal limit", "ansi a300 pruning", "25
percent pruning", "live crown ratio", "over pruning", "lions tailing", "foliage removal limit"); the id appended to the
arborist renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the removal-percent, the class caps, the within-standard flag, and
the error seams (non-finite, non-positive foliage, negative removal, bad class). Hand-writes its renderer (mirroring the
calc-arborist.js pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the removal / cap / within stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the mature example -> 15% within 25%).

## 5. Roadmap position

Completes the arborist care trio with `tree-protection-zone` (construction) and `trunk-decay-strength` (risk). A live-
crown-ratio helper (estimating the crown before pruning from height and crown base) and a dose-over-multiple-seasons
scheduler are deliberate future follow-ons. Further Group L growth stays evidence-driven.
