# roughlogic.com Specification v991 -- Block-and-Tackle Reeving Line Pull (calc-rigging.js, Group Z, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z),
> no new module, group, or dependency. Inherits spec.md through spec-v990.md. Beside `block-redirect-load`,
> `chain-lever-hoist`, and the rope/pulley mechanical-advantage tiles.
>
> **The gap, and the evidence for it.** The catalog has redirect-block resultants and lever-hoist effort, but nothing
> computes the hauling-line tension across the PARTS OF LINE of a reeved block and tackle -- the everyday crane-hoist
> and come-along number, including the friction the ideal load/N misses. Grep confirmed no reeving / parts-of-line
> tile. The number this settles: a 20,000 lb load on 4 parts at k 0.98 needs **5,152 lb** on the hauling line, not
> 5,000.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, lb and a ratio), bounds-fuzzer, worked-example
registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a non-positive load, a non-integer or
< 1 parts count, or a per-sheave efficiency outside (0, 1] returns `{ error }`; the frictionless limit (k = 1) returns
load/N exactly. Citation discipline (v19/v22): the block-and-tackle reeving efficiency by name (Wire Rope Users Manual
/ Crosby practice; ASME B30 hoisting), `GOVERNANCE.general`; the note stresses that friction stacks part to part, that
this is the STEADY lead-line pull (not the inertia to start the load), and that the block/rope ratings, the actual
sheave friction, and a qualified rigger and the lift plan govern.

## 2. The tile

### 2.1 `reeving-parts-of-line` -- Block-and-Tackle Reeving Line Pull

```
inputs:
  load_lb           load lifted (lb), default 20000
  parts_of_line     number of parts of line N (whole number >= 1), default 4
  sheave_efficiency per-sheave efficiency k (~0.98 roller, 0.96 plain), default 0.98

frictionless_pull_lb = load_lb / parts_of_line
hauling_line_pull_lb = load_lb x (1 - k) / (1 - k^N)   (= load/N when k = 1)
reeving_efficiency   = load_lb / (parts_of_line x hauling_line_pull_lb)
```

**Pinned worked example.** 20,000 lb on 4 parts, k 0.98: `pull = 20,000 x 0.02 / (1 - 0.98^4) = ` **5,152 lb** (above
the frictionless 5,000); `efficiency = 20,000 / (4 x 5,152) = ` **97.0%**. Cross-check: 10,000 lb on 2 parts, k 0.98:
`pull = 10,000 x 0.02 / (1 - 0.98^2) = ` **5,050 lb**, **99.0%** -- one sheave loses little.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`, beside `block-redirect-load`); a `tile-meta.js` `_TILES` entry
(`Z`); a `citations.js` entry (Wire Rope Users Manual / Crosby / ASME B30 reeving, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 4-part base plus the 2-part cross-check, pinning the pull, the frictionless
share, and the efficiency); `test/fixtures/compute-map.js` (`reeving-parts-of-line` -> `computeReevingPartsOfLine`,
module `../../calc-rigging.js`); `scripts/related-tiles.mjs` (-> `chain-lever-hoist` / `pulley-ma-gen` / `rope-ma`);
`data/search/aliases.json` (5 collision-checked aliases: "reeving", "parts of line", "block and tackle pull", "hauling
line pull", "sheave efficiency"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`RIGGING_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-rigging declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the frictionless (k=1) limit, the
lower-efficiency / more-parts directions, and the error seams. The calc-rigging.js gzip cap and the Group Z group shell
are watched at build (cap raised for this tile). Home tile count 1,439 -> 1,440.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(20,000 lb / 4 parts / 0.98 -> 5,152 lb, 97.0%).

## 5. Roadmap position

Block-and-tackle rigging beside `block-redirect-load`, serving the rigger (rigging). Deliberately the steady
lead-line pull; the block and rope ratings, the true sheave friction, the reeving pattern, and a qualified rigger and
the lift plan govern. Stays evidence-driven. Continues the rigging sweep at 1 new spec (v991).
