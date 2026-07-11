# roughlogic.com Specification v607 -- Open-Cavity Trunk Strength Loss (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`**
> (Group L, the forestry / arborist bench); no new module, group, or dependency. Inherits spec.md through spec-v606.md.
>
> **The gap, and the evidence for it.** Spec-v565 (`trunk-decay-strength`) names this tile as a deliberate follow-on:
> "an open-cavity (opening-angle) reduction per Smiley & Fraedrich," and its own note warns that "an OPEN cavity (a
> slot, not a closed pipe) is far weaker than this closed-hollow estimate." The v565 tile uses Wagener's cube law,
> which assumes a **closed** ring of sound wood around a concentric hollow. A real decay cavity often has an open face
> -- a wound, a seam, a fire scar -- and the open ring is structurally a broken tube, which loses far more strength than
> a closed one. The Smiley & Fraedrich (1992) formula is the accepted correction: it adds the fraction of the remaining
> sound wood that the opening compromises, `loss% = (d^3 + R x (D^3 - d^3)) / D^3 x 100`, where R is the cavity
> opening's arc as a fraction of the trunk circumference. When the opening closes (R = 0) it collapses exactly to the
> Wagener `(d/D)^3` the v565 tile already computes; when the opening is wide it drives the loss sharply up. The formula
> is validated against the paper's own example -- a 4-inch stem 70% hollow with a 2-inch opening loses 45% -- which this
> tile reproduces. It gives the arborist the open-cavity number the closed-hollow screen understates, while keeping the
> same "a screen, not a load rating" discipline.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The trunk diameter, the
sound-shell thickness, the hollow diameter, and the cavity opening width are `L` (in); the circumference is `L` (in);
the opening ratio R, the closed and open strength losses, and the opening penalty are `dimensionless` (%), all carried
dimensionless to the parse-only lint alongside the `trunk-decay-strength` sibling. The v18/v21 contract: any non-finite
input, a non-positive diameter or shell thickness, a shell at least half the diameter (no hollow to assess), or a
negative cavity opening returns `{ error }`; an opening wider than the circumference is clamped to a fully open ring
(R = 1). Citation discipline (v19/v22): `GOVERNANCE.general` over the Smiley & Fraedrich (1992) open-cavity formula by
name (matching the `trunk-decay-strength` sibling); `editionNote` prints `hollow_d = diameter - 2 x shell_thick`,
`R = min(1, opening_width / (pi x diameter))`, `closed_loss = (hollow_d^3 / diameter^3) x 100` (the Wagener closed
hollow), and `open_loss = (hollow_d^3 + R x (diameter^3 - hollow_d^3)) / diameter^3 x 100`, and states that **R is the
cavity opening's arc as a fraction of the circumference (an open face makes the ring a broken tube, far weaker than a
closed hollow), the formula collapses to Wagener's cube law when the opening closes, it can underestimate a large
cavity with a deep wedge and a thick sound wall so it is used with caution there, the ISA 33% strength-loss guide is a
common concern trigger not a failure prediction, and a qualified arborist and an ISA TRAQ assessment govern** -- a
screen, not a load rating.

## 2. The tile

### 2.1 `tree-open-cavity` -- Open-Cavity Strength Loss (Smiley & Fraedrich)

```
inputs:
  diameter_in       in   trunk diameter (inside bark)
  shell_thick_in    in   sound-shell (wall) thickness
  opening_width_in  in   width of the open cavity face (0 = closed hollow)

hollow_d_in   = diameter_in - 2 x shell_thick_in                            [in]
circumference = pi x diameter_in                                            [in]
R             = min(1, opening_width_in / circumference)                    [--]
closed_loss   = (hollow_d_in^3 / diameter_in^3) x 100                       [%]  (Wagener closed hollow)
open_loss     = (hollow_d_in^3 + R x (diameter_in^3 - hollow_d_in^3)) / diameter_in^3 x 100   [%]
opening_penalty = open_loss - closed_loss                                   [%]
```

**Pinned worked example (a 24-inch trunk, 3-inch sound wall, 8-inch open cavity).**
`hollow_d = 24 - 6 = 18 in`, `circumference = pi x 24 = 75.40 in`, `R = 8 / 75.40 = 0.106`. The closed Wagener loss is
`(18^3 / 24^3) x 100 = ` **42.2%**, but the open cavity raises it to
`(5,832 + 0.106 x (13,824 - 5,832)) / 13,824 x 100 = ` **48.3%** -- a **6.1-point** penalty for the opening that the
closed-hollow screen misses, pushing the stem past the ISA 33% concern line by more than the shell alone suggests.
**Cross-check (the Smiley & Fraedrich published example -- a 4-inch stem 70% hollow, 2-inch opening).**
`hollow_d = 2.8 in` (70% of 4), `R = 2 / (pi x 4) = 0.159`,
`open_loss = (2.8^3 + 0.159 x (4^3 - 2.8^3)) / 4^3 x 100 = ` **44.8%** -- matching the paper's reported **45%**, which
validates the formula, while the closed Wagener loss for the same hollow is only 34.3%.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["forester", "timber"]`, placed beside `trunk-decay-strength` -- **outside**
the counted `// Group L: Agriculture` .. `// Group M` block like the other arborist tiles, so the `citations.test.js`
Group L audit count does **not** change); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`,
`editionNote` per §1); `test/fixtures/worked-examples.json` (both examples, incl. the paper validation);
`test/fixtures/compute-map.js` (`tree-open-cavity` -> `computeTreeOpenCavity` in `../../calc-arborist.js`);
`scripts/related-tiles.mjs` (-> `trunk-decay-strength` / `tree-protection-zone` / `crown-pruning-dose`);
`data/search/aliases.json` ("open cavity strength loss", "smiley fraedrich", "tree cavity opening", "hollow tree
opening", "cavity strength loss", plus question rows); the id appended to the calc-arborist declare list in `app.js`;
the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning both examples, the R=0-collapses-to-Wagener identity, the opening-raises-loss behavior, and the error
seams (non-finite, non-positive diameter / shell, shell >= half diameter, negative opening). Renderer hand-written
mirroring `trunk-decay-strength` (`makeNumber` / `makeOutputLine`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the 24-inch example -> 48.3% open loss).

## 5. Roadmap position

Gives `trunk-decay-strength` the open-cavity correction its own note flags, beside `tree-protection-zone` and
`crown-pruning-dose`. The v565-named load-vs-capacity (wind moment against residual section) screen remains a
deliberate future follow-on. Further Group L growth stays evidence-driven.
