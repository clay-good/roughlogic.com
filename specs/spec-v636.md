# roughlogic.com Specification v636 -- Sag Vertical Curve Minimum Length (AASHTO) (calc-civil.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-civil.js`** (Group E,
> civil), no new module, group, or dependency. Inherits spec.md through spec-v635.md.
>
> **The gap, and the evidence for it.** Spec-v337 (`vertical-curve-sight-distance`) sizes a **crest** vertical curve
> for stopping sight distance, and its own citation hands the other half off explicitly: "This is the crest SSD
> control -- **sag curves use headlight/comfort/drainage criteria**." A sag (valley) curve is limited at night not
> by the crest geometry but by how far the headlights reach up the far grade, and the governing minimum length comes
> from that headlight sight line, the same class of AASHTO Green Book relation the crest tile already computes. The
> number this settles: a 4% grade change that needs 400 ft of stopping sight distance requires a **350 ft** sag
> curve (K = 87.5) so the headlights light the road that far ahead -- the companion the crest tile deliberately left
> for this one.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the crest
`vertical-curve-sight-distance` sibling: the grade difference is `dimensionless` (percent), the sight distance and
the curve length are `L` (ft), and the rate of vertical curvature K is `L` (ft per percent, as the crest tile
labels it). The headlight-criterion constants `400` and `3.5` embed the AASHTO 2.0 ft headlight height and 1-degree
upward beam divergence (`400 = 200 x 2.0`, `3.5 ~ 200 x tan 1deg`), the same class of Green Book design constant the
crest tile bakes into its C = 2158. The v18/v21 contract: any non-finite input, a non-positive grade difference or
sight distance, or a degenerate result (`L <= 0`, the grade change too small to require a curve) returns `{ error }`,
matching the crest tile. Citation discipline (v19/v22): AASHTO A Policy on Geometric Design of Highways and Streets
(the Green Book), sag headlight criterion, by name; the note states that **this is the headlight-SSD control (the
governing sag criterion for stopping), the comfort criterion `L = A V^2 / 46.5` and drainage `K <= 167` are separate
checks, and a licensed civil engineer's design governs**.

## 2. The tile

### 2.1 `sag-vertical-curve` -- Minimum Sag Curve Length for Headlight Sight Distance

```
inputs:
  A_pct   %    algebraic grade difference |g2 - g1| (> 0)
  S_ft    ft   stopping sight distance (> 0)

denom = 400 + 3.5 x S_ft                        (the headlight sight-line term)
S <= L:  L = A x S^2 / denom                     [ft]
S >  L:  L = 2 x S - denom / A                    [ft]
K = L / A                                        [ft per %]
```

**Pinned worked example (a 4% sag at 400 ft SSD).** A = 4%, S = 400 ft: `denom = 400 + 3.5 x 400 = 1800`, the S <= L
form gives `L = 4 x 400^2 / 1800 = 355.6 ft` which is less than S, so the S > L form governs: `L = 2 x 400 - 1800/4 =
800 - 450 = ` **350 ft**, `K = 350/4 = ` **87.5 ft/%**. **Cross-check (a sharper sag, longer sight distance).** A =
6%, S = 600 ft: `denom = 2500`, `L = 6 x 600^2 / 2500 = ` **864 ft** (here S <= L, that branch governs), `K = ` **144
ft/%** -- the longer, sharper curve a faster road with a bigger grade break needs.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["civil"]`, beside `vertical-curve-sight-distance`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (AASHTO Green Book sag headlight criterion, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`sag-vertical-curve` ->
`computeSagVerticalCurve` in `../../calc-civil.js`); `scripts/related-tiles.mjs` (-> `vertical-curve-sight-distance`
/ `stopping-sight-distance` / `superelevation` where present); `data/search/aliases.json` ("sag vertical curve",
"headlight sight distance", "valley curve length", "sag curve K value", plus question rows);
`CIVIL_RENDERERS["sag-vertical-curve"]` via a hand-written renderer (the module's `makeNumber` / `makeOutputLine` /
`attachExampleButton` / `debounce` / `fmt` helpers, mirroring `vertical-curve-sight-distance`) and the id added to
the calc-civil declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the two-branch selection, and the error
seams (non-finite, non-positive A / S, degenerate L). Group E has no exact audit-count assertion and the mechanical-
governance test is an explicit list, so no count bump. The calc-civil.js gzip cap is expected to hold (verify at
build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> L 350 ft, K 87.5 ft/%).

## 5. Roadmap position

Completes the vertical-curve pair spec-v337 opened: the crest tile controls for crest SSD, this one for the sag
headlight sight distance. The comfort and drainage sag criteria are separate, simpler checks a future tile could add
if evidence warrants. Further Group E growth stays evidence-driven.
