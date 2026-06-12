# roughlogic.com Specification v50 — Baker's Percentage (1 New Tile)

> **Implementation status: CLOSED 2026-06-12 (package stamped 0.45.0, a
> minor; catalog 577 -> 578, wiring lint 30 renderer modules / 578 tile-id
> entries).** v50 is a catalog-growth spec in the lineage of the single-tile
> deepening specs. It inherits everything from spec.md through spec-v49.md and
> changes none of it.
>
> v50 deepens **Group O (Kitchen and Food Service)** -- at 7 tiles the most
> under-served *substantive* group (only the intentionally-tiny Group Q is
> smaller) -- with the one common food-service formulation the catalog did not
> cover: baker's percentage. **No new group, no new module, no new dependencies,
> no telemetry, no AI, US standards only.** It lands in `calc-kitchen.js`.
>
> **The gap.** Group O already covers recipe scaling (`recipe-scale`), AP/EP
> yield (`yield-ep`), menu pricing (`plate-cost`), pan conversion, sous-vide
> pasteurization, the food-safety cooling curve, and brine/cure. But every bakery
> and pizzeria writes its dough formulas in **baker's percentage** -- flour =
> 100%, each ingredient as a percent of flour, hydration = water / flour -- and no
> tile did that. It is explicitly *not* recipe scaling: the `recipe-scale`
> renderer even warns "bakers' percentages and yeast / leavening do not scale
> linearly", which is the acknowledgement that this is a separate method.

Repository: github.com/clay-good/roughlogic.com — US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply to the new tile.
- The v18/v21 tile contract applies from the first commit: a non-positive flour
  weight, a negative percentage, or a non-finite input returns `{ error }`; with
  no piece count the per-piece field is `null` (not a leak); no tile throws,
  hangs, or leaks a non-finite output field.
- The v19/v22 citation discipline applies to the new `citations.js` entry: it is
  first-principles arithmetic (public domain), cited as such.
- The tile id is kebab-case and was checked against the 577 live ids:
  `bakers-percentage` does not collide and does not duplicate an existing tile by
  concept (see §3).

## 2. The tile

### `bakers-percentage` — Baker's Percentage (Group O, calc-kitchen.js)

Flour is the 100% basis. Each ingredient's weight is `flour x percent / 100`;
hydration is the water percentage. From the flour weight and the percentages:

```
water = flour x hydration% / 100
salt  = flour x salt% / 100
yeast = flour x yeast% / 100
other = flour x other% / 100            (oil, sugar, etc., optional)
total dough = flour + water + salt + yeast + other
total formula % = 100 + hydration% + salt% + yeast% + other%
per piece = total dough / pieces        (when a piece count is given)
```

Weights are reported in grams (the baker's-math standard) with an ounce
conversion on the totals. Yeast amount and ferment time are leaven-type /
temperature / schedule specific and are noted as user-supplied, not prescribed.

**Worked example (pinned).** 1000 g flour, 65% hydration, 2% salt, 1% yeast, 4
pieces: water `= 1000 x 0.65 = 650 g`, salt `20 g`, yeast `10 g`, total dough
`= 1680 g`, total formula `168%`, per piece `= 1680 / 4 = 420 g`. Cross-check (a
75%-hydration pizza dough, 500 g flour, 2% salt, 4% oil, no pieces): water 375 g,
total 905 g, per-piece reported as null.

## 3. Concept-check and wiring

Concept-checked against the 577 live tiles: `recipe-scale` scales a finished
recipe by a factor (and explicitly disclaims baker's percentages); `yield-ep`
converts as-purchased to edible-portion by yield percent; `plate-cost`,
`pan-conversion`, `brine-cure`, `sous-vide-pasteurization`, and `cooling-curve`
are unrelated. No baker's-percentage / dough-hydration / bread-formula tile
exists. **Ships.**

Per-tile wiring: a `tools-data.js` row (group `O`), `tile-meta.js` `_TILES`,
`citations.js`, `test/fixtures/worked-examples.json`,
`test/fixtures/compute-map.js` (module path `../../calc-kitchen.js`),
`scripts/related-tiles.mjs` (`bakers-percentage` -> `recipe-scale` / `plate-cost`
/ `yield-ep`), `data/search/aliases.json` (5 aliases), the `app.js`
`KITCHEN_RENDERERS` declare, the `// dims:` annotation, the regenerated v14 corpus
+ tile-index, a `test/unit/bounds-fuzzer.test.js` block pinning the worked example
+ the pizza/no-pieces case + the error seams, and the Group-O count assertion in
`test/unit/citations.test.js` (7 -> 8). The `tools-data.js` registry fit the new
row within its 48000 B cap.

## 4. As-landed verification (gate plan)

The same green bar the recent tile specs cleared: `npm run lint` (every gate; the
wiring lint must report **30 renderer modules / 578 tile-id entries**; the
spec-v49 `check-readme-counts` gate must agree at 578 tiles / 604 sitemap URLs),
`npm test` (the unit suite, +1 test -> 5,515, plus the Group-O count bump),
`npm run build` (578 tile + 24 group shells, 604-URL sitemap), `npm run
data:verify`, the worked-examples runner (+1 fixture), the 320 px shell audit
(578 tile shells), and the full-catalog render-no-nan Chromium sweep plus the
a11y gate (the new tile verified clean, rendered output read to the digit).

## 5. Roadmap position

v50 brings Group O to 8 tiles. `calc-kitchen.js` is now at ~94% of its 13 KB cap,
so the next kitchen tile needs a cap bump (it is lazy-loaded, so the bump is
spec-v10 §H.2-safe). The standing module-cap watch list otherwise carries
`calc-kitchen.js`, `tools-data.js` (97% of 48000 B), and the recurring near-cap
calc modules. Further first-principles candidates remain whatever survives a live
concept-check; the under-served substantive groups (O now 8, N 11, P 11, S 12)
are the natural places to look next.
