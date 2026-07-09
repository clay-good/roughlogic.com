# roughlogic.com Specification v566 -- Tree Protection / Critical Root Zone (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, agriculture and forestry); no new module, group, or dependency. Inherits spec.md through spec-v565.md.
>
> **The gap, and the evidence for it.** When construction happens near a tree, ANSI A300 Part 5 defines a tree
> protection zone (the critical root zone) that must be fenced off, and the bench has no tile to size it. The catch that
> kills trees is that the zone is set by **trunk diameter, not the canopy dripline**: a columnar tree with a narrow
> crown still needs the full radius, so sizing the fence to the visible canopy under-protects the roots. The standard
> radius is one foot per inch of DBH, with a conservative 1.5 feet per inch for mature or sensitive trees, and the
> protection is cumulative over the whole circle -- fencing plus no grade change, no compaction, and no trenching, to a
> protected soil depth. The tile takes the DBH and the radius factor, and returns the protection radius and the fenced
> area, so the exclusion zone is drawn from the trunk, not the branches.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The DBH is a length (`L`,
in inches); the radius factor is a length per length (ft per in, carried as `dimensionless` with the convention); the
protection radius is a length (`L`, in ft); the fenced area is an area (`L^2`, in ft^2). The v18/v21 contract: any non-
finite input, a non-positive DBH, or a non-positive radius factor returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the protection-zone relations by name (ANSI A300 Part 5; ISA critical root zone);
`editionNote` names the **tree protection zone / critical root zone**, prints `radius = radius_factor x DBH` and
`area = pi x radius^2`, notes the factors (**1.0 ft per in standard, 1.5 ft per in conservative/mature**), and states
that **the zone is set by trunk diameter not the canopy dripline (a narrow-crowned tree still needs the full radius),
protection is cumulative over the whole circle -- fencing plus no grade change, compaction, or trenching to the
protected soil depth -- and a qualified arborist and the local ordinance govern** -- a planning aid, not an arborist's
prescription.

## 2. The tile

### 2.1 `tree-protection-zone` -- The Exclusion Radius Set by the Trunk, Not the Branches

```
inputs:
  dbh_in           in       diameter at breast height
  radius_factor    ft/in    radius factor (1.0 standard, 1.5 conservative/mature)

radius_ft = radius_factor x dbh_in                    [ft]
area_ft2  = pi x radius_ft^2                           [ft^2]
```

**Pinned worked example (a 20 in DBH tree at the standard 1.0 ft/in factor).** The protection radius is
`1.0 x 20 = 20 ft`, so the fenced circle is `pi x 20^2 = ` **1,257 ft^2** -- and that radius holds even if the crown is
narrow, because roots extend from the trunk regardless of the canopy shape. **Cross-check (a mature tree gets the
conservative factor).** For the same 20 in tree treated as mature at 1.5 ft/in: the radius grows to `1.5 x 20 = 30 ft`
and the fenced area to `pi x 30^2 = ` **2,827 ft^2** -- more than double the area, the extra buffer a valuable mature
tree warrants. The tile returns the protection radius and the fenced area.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["arborist"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the standard example + the
conservative cross-check); `test/fixtures/compute-map.js` (`tree-protection-zone` -> `computeTreeProtectionZone` in
`../../calc-arborist.js`); `scripts/related-tiles.mjs` (-> `trunk-decay-strength` / `crown-pruning-dose` /
`reineke-sdi`); `data/search/aliases.json` ("tree protection zone", "critical root zone", "crz", "tpz", "ansi a300
part 5", "root protection radius", "construction tree fence", "dbh root zone"); the id appended to the arborist
renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the radius = factor x DBH relation, the area, and the error seams (non-finite, non-positive
DBH / factor). Hand-writes its renderer (mirroring the calc-arborist.js pattern). Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the radius / area stack wraps on a phone); render-no-nan + a11y on the new tile, output read to
the value (the standard example -> 20 ft, 1,257 ft^2).

## 5. Roadmap position

Adds the construction protection zone beside `trunk-decay-strength` and `crown-pruning-dose`. A trunk-encroachment
percent (how much of the CRZ a proposed footprint intrudes) and a species-tolerance factor are deliberate future
follow-ons. Further Group L growth stays evidence-driven.
