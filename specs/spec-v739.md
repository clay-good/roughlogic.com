# roughlogic.com Specification v739 -- Max Redirect Angle for a Block WLL (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`** (Group Z),
> no new module, group, or dependency. Inherits spec.md through spec-v738.md. Explore sweep #13 (entry 4).
>
> **The gap, and the evidence for it.** The `block-redirect-load` tile runs the resultant statics forward: from a
> direction change it returns the resultant on the block and anchor. The rigger's question is the inverse -- **how far a
> block or anchor of a rated WLL can turn the line** before the resultant exceeds the rating. From
> `resultant = 2 x T x sin(angle/2)`, `angle = 2 x asin( WLL / (2T) )`. The number this settles: a **3,000 lb** line
> through a **5,000 lb** block can turn up to **112.9 degrees**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`block-redirect-load` sibling: the line tension, block WLL, and resultant are `M L T^-2` (lb), and the returned angle is
dimensionless (degrees). It reuses the sibling's vector-resultant statics (ASME B30.26), solved for the angle. The v18/v21
contract: any non-finite input, a non-positive line tension, or a non-positive block WLL returns `{ error }`; when the WLL
is at least twice the line tension the resultant never reaches it (it peaks at 2T at a 180-degree turn), so the tile
returns a capped 180 degrees with an `unlimited` flag rather than an out-of-domain `asin`. Citation discipline (v19/v22):
the resultant statics solved for the angle, `GOVERNANCE.rigging` matching the sibling; the note states that the resultant
**peaks at twice the line tension** at a 180-degree turn, that past the max angle the block, anchor sling, and attachment
point must be resized for the resultant, and that **shock loading multiplies this further -- keep margin; the qualified
rigger and the tags govern**.

## 2. The tile

### 2.1 `block-redirect-max-angle` -- Max Redirect Angle for a Block WLL

```
inputs:
  line_tension_lb   M L T^-2   line tension through the block (lb, > 0)
  block_wll_lb      M L T^-2   block / anchor rated WLL (lb, > 0)

ratio          = block_wll_lb / (2 x line_tension_lb)
max_angle_deg  = ratio >= 1 ? 180 : 2 x asin(ratio) in degrees      (unlimited when ratio >= 1)
resultant_at_max_lb = 2 x line_tension_lb x sin(max_angle_deg / 2)
```

**Pinned worked example.** line tension = 3,000 lb, WLL = 5,000 lb:
`ratio = 5000 / 6000 = 0.8333`, `angle = 2 x asin(0.8333) = ` **112.9 deg**, resultant at that angle = 5,000 lb (the WLL).
Feeding 112.9 degrees back through `block-redirect-load` at 3,000 lb returns a 5,000 lb resultant, the WLL. A 7,000 lb
block (over 2 x 3,000) can turn any angle up to 180 degrees within rating.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging"]`) placed beside `block-redirect-load` (Group Z is not exact-count
audited); a `tile-meta.js` `_TILES` entry; a `citations.js` entry (resultant statics solved for the angle,
`GOVERNANCE.rigging` matching the sibling); `test/fixtures/worked-examples.json` (the pinned example);
`test/fixtures/compute-map.js` (`block-redirect-max-angle` -> `computeBlockRedirectMaxAngle`);
`scripts/related-tiles.mjs` (-> `block-redirect-load` / `tagline-force` / `chain-lever-hoist`);
`data/search/aliases.json` (5 collision-checked question aliases: "max redirect angle", "how far can I turn a block",
...); the calc-rigging `RIGGING_RENDERERS` map entry via a hand-written renderer (two number fields) and the id added to
the calc-rigging declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeBlockRedirectLoad` across a tension/WLL sweep, the WLL>=2T unlimited cap, the higher-WLL-larger-angle
monotonicity, and the error seams. The calc-rigging.js gzip cap (raised to 28500 B in this spec) covers the addition.
Verify at build, including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,187 -> 1,188.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 112.9 deg for a 3,000 lb
line through a 5,000 lb block).

## 5. Roadmap position

Pairs the forward block tile (`block-redirect-load`, resultant from the angle) with its inverse (the max angle for a WLL),
the two halves of the redirect-block question. Continues Explore sweep #13; further Group Z rigging growth stays
evidence-driven.
