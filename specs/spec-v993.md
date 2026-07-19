# roughlogic.com Specification v993 -- Cattle Live Weight from Heart Girth (calc-agriculture.js, Group L, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-agriculture.js`** (Group
> L), no new module, group, or dependency. Inherits spec.md through spec-v992.md. Beside `cattle-stocking-rate`,
> `livestock-dry-matter-intake`, and `thi-livestock`.
>
> **The gap, and the evidence for it.** The catalog uses an animal's body weight as an INPUT (`livestock-dry-matter-
> intake`) but never estimates it. Grep confirmed no heart-girth / weigh-tape tile. The number this settles, the
> everyday no-scale estimate: a 70 in heart girth, 55 in long steer is about **898 lb**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, lb from inches), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive girth or length
returns `{ error }`. Citation discipline (v19/v22): Schaeffer's cattle-weight formula by name (Penn State / University
of Missouri Extension), `GOVERNANCE.general`; the note explains the measurement points (girth behind the front legs,
length shoulder-point to pin bone), that the formula is calibrated for mature beef-type cattle and off for very
young/fat/thin/dairy/pregnant animals, and that a certified scale governs a sale weight.

## 2. The tile

### 2.1 `cattle-heart-girth-weight` -- Cattle Live Weight from Heart Girth

```
inputs:
  heart_girth_in  heart girth (in, circumference behind the front legs), default 70
  body_length_in  body length (in, point of shoulder to pin bone), default 55

live_weight_lb = heart_girth_in^2 x body_length_in / 300   (Schaeffer's formula)
```

**Pinned worked example.** 70 in heart girth, 55 in body length: `weight = 70^2 x 55 / 300 = 4,900 x 55 / 300 = ` **898
lb**. Cross-check: a smaller 60 x 48 in heifer: `weight = 60^2 x 48 / 300 = ` **576 lb**.

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["agriculture"]`, beside `cattle-stocking-rate`); a `tile-meta.js` `_TILES`
entry (`L`); a `citations.js` entry (Schaeffer's formula / extension guidance, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base steer plus the heifer cross-check, pinning the weight);
`test/fixtures/compute-map.js` (`cattle-heart-girth-weight` -> `computeCattleHeartGirthWeight`, module
`../../calc-agriculture.js`); `scripts/related-tiles.mjs` (-> `cattle-stocking-rate` / `livestock-dry-matter-intake` /
`thi-livestock`); `data/search/aliases.json` (5 collision-checked aliases: "cattle weight", "heart girth", "weigh
tape", "cattle live weight", "estimate cattle weight"), then `node scripts/build-alias-shards.mjs`; the tile is
rendered by the `_r` factory in the `AGRICULTURE_RENDERERS` map, and the id added to the calc-agriculture declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the girth-squared / length-linear scaling, and
the error seams. The calc-agriculture.js gzip cap and the Group L group shell are watched at build (cap raised for the
ag discovery batch). Home tile count 1,441 -> 1,442.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(70 in x 55 in -> 898 lb).

## 5. Roadmap position

Livestock beside `cattle-stocking-rate`, serving the cattle producer (agriculture). Deliberately the on-farm weigh-tape
estimate; a certified livestock scale governs a sale weight, and a vet or the tape maker's chart governs a dose or a
market decision. Stays evidence-driven. Continues the agriculture sweep at 1 new spec (v993).
