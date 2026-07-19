# roughlogic.com Specification v989 -- Conduit Nipple 60% Fill (NEC Ch. 9 Note 4) (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v988.md. Beside the raceway-fill family
> (`conduit-fill`, `box-fill`, `conduit-jam-ratio`).
>
> **The gap, and the evidence for it.** The generic `conduit-fill` tile applies the ordinary 40%/31%/53% limits, but
> nothing handles the NIPPLE exception -- the 60% fill (and ampacity-derate exemption) NEC Chapter 9 Note 4 allows for
> a raceway <= 24 in between enclosures, which electricians look up constantly for short runs between panels and boxes.
> The number this settles: 20 #10 THHN in a 1 in EMT nipple = **48.8%**, legal in a nipple but not in a normal run.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, a percent from two areas and a count), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive conduit
area, conductor area, or count returns `{ error }`. Citation discipline (v19/v22): NEC Chapter 9 Note 4 by name (the
60% nipple allowance and the 310.15(C)(1) ampacity-adjustment exemption), with the conduit and conductor areas from
Chapter 9 Tables 4 and 5, `GOVERNANCE.general`; the note stresses that the exact table areas, the box/pull-can sizing,
and the AHJ and adopted NEC edition govern.

## 2. The tile

### 2.1 `conduit-nipple-60-fill` -- Conduit Nipple 60% Fill (NEC Ch. 9 Note 4)

```
inputs:
  conduit_area_sqin    conduit total area (sq in, NEC Ch. 9 Table 4), default 0.864 (1 in EMT)
  conductor_area_sqin  each conductor area (sq in, NEC Ch. 9 Table 5), default 0.0211 (#10 THHN)
  conductor_count      number of conductors, default 20

fill_area_sqin       = conductor_count x conductor_area_sqin
fill_pct             = 100 x fill_area_sqin / conduit_area_sqin
nipple_max_conductors = floor(0.60 x conduit_area_sqin / conductor_area_sqin)
normal_max_conductors = floor(0.40 x conduit_area_sqin / conductor_area_sqin)
verdict: > 60% too full even for a nipple; <= 40% passes both; else nipple-only
```

**Pinned worked example.** 20 #10 THHN (0.0211 in^2) in a 1 in EMT nipple (0.864 in^2): `fill = 20 x 0.0211 / 0.864 = `
**48.8%** -- legal in a nipple (the 60% cap allows **24**) but over the normal 40% (allows only **16**). Cross-check:
30 #12 THHN (0.0133 in^2) in the same nipple: `fill = 30 x 0.0133 / 0.864 = ` **46.2%**; the nipple allows **38**, a
normal run 25.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `open-delta-transformer`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (NEC Ch. 9 Note 4, `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
#10 base plus the #12 cross-check, pinning the fill percent and both maxima); `test/fixtures/compute-map.js`
(`conduit-nipple-60-fill` -> `computeConduitNipple60Fill`, module `../../calc-electrical.js`);
`scripts/related-tiles.mjs` (-> `conduit-fill` / `box-fill` / `conduit-jam-ratio`); `data/search/aliases.json` (5
collision-checked aliases: "conduit nipple", "nipple fill", "60 percent fill", "close nipple fill", "nipple conductor
fill"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `ELECTRICAL_RENDERERS` map
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning both examples, the verdict bands and their edges, the nipple-allows-more
identity, and the error seams. The calc-electrical.js gzip cap and the Group A group shell are watched at build
(headroom available; no raise needed). Home tile count 1,437 -> 1,438.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20 #10 THHN / 1 in EMT -> 48.8%, 24 nipple / 16 normal).

## 5. Roadmap position

Raceway fill beside `conduit-fill`, serving the electrician (electrical). Deliberately the fill screen; the exact
Chapter 9 Table 4/5 areas, the box and pull-can sizing, and the AHJ and adopted NEC edition govern. Stays
evidence-driven. Continues the electrical sweep at 1 new spec (v989).
