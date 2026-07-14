# roughlogic.com Specification v730 -- Minimum Sound Shell for an Allowable Trunk Strength Loss (calc-arborist.js, Group L, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-arborist.js`** (Group L),
> no new module, group, or dependency. Inherits spec.md through spec-v729.md. Explore sweep #12 (entry 8).
>
> **The gap, and the evidence for it.** The `trunk-decay-strength` tile runs the Wagener cube-law screen forward: from a
> trunk diameter and a sound-shell thickness it returns the strength loss. The tree-risk question is the inverse -- **how
> thick a sound shell a trunk needs to stay within an acceptable strength loss**. From `loss% = ((D - 2t)/D)^3 x 100`,
> `t = (D/2) x (1 - (loss/100)^(1/3))`. The number this settles: a **24-in** trunk held to a **29.6%** loss needs a
> **4.0-in** shell (t/R 0.33, just above the Mattheck 0.30 trigger).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`trunk-decay-strength` sibling: the diameter and shell thickness are `L` (in), and the allowable loss and t/R ratio are
dimensionless. It reuses the sibling's Wagener cube-law model, solved for the shell thickness, and carries the Mattheck
t/R < 0.30 concern flag. The v18/v21 contract: any non-finite input, a non-positive diameter, a non-positive allowable
loss, or an allowable loss at or above 100% (a 100% loss means no sound wood) returns `{ error }`. Citation discipline
(v19/v22): the Wagener cube law solved for the shell, `GOVERNANCE.general` matching the sibling; the note states that
because loss goes as the **cube** of the hollow ratio the minimum shell is **small** (a thin shell still holds most of the
strength), flags a shell **below the Mattheck t/R 0.30** trigger, and closes with **an open cavity is far weaker; a
screen, not a load rating; a qualified arborist and an ISA TRAQ assessment govern**.

## 2. The tile

### 2.1 `trunk-min-shell-thickness` -- Minimum Sound Shell for an Allowable Trunk Strength Loss

```
inputs:
  diameter_in      L             trunk diameter outside bark (in, > 0)
  allow_loss_pct   dimensionless maximum acceptable strength loss (%, 0 < loss < 100)

ratio        = (allow_loss_pct / 100)^(1/3)
min_shell_in = (diameter_in / 2) x (1 - ratio)
hollow_d_in  = diameter_in - 2 x min_shell_in
min_t_over_r = min_shell_in / (diameter_in / 2)
below_mattheck = min_t_over_r < 0.30
```

**Pinned worked example.** diameter = 24 in, allowable loss = 29.6%:
`ratio = 0.296^(1/3) = 0.6664`, `min_shell = 12 x (1 - 0.6664) = ` **4.0 in**, t/R = 0.333 (at/above the Mattheck 0.30
trigger). Feeding 4.0 in back through `trunk-decay-strength` at 24 in returns a 29.6% loss, the input. Accepting a larger
42.2% loss drops the minimum shell to 3.0 in (t/R 0.25, below the Mattheck trigger).

## 3. Wiring

A `tools-data.js` row (group `L`, trades `["arborist"]`) placed beside `trunk-decay-strength` in the later spec-v565
section, well past the Group L exact-count audit block; a `tile-meta.js` `_TILES` entry; a `citations.js` entry (Wagener
cube law solved for the shell, `GOVERNANCE.general` matching the sibling); `test/fixtures/worked-examples.json` (the
pinned example); `test/fixtures/compute-map.js` (`trunk-min-shell-thickness` -> `computeTrunkMinShellThickness`);
`scripts/related-tiles.mjs` (-> `trunk-decay-strength` / `tree-open-cavity` / `log-limb-weight`);
`data/search/aliases.json` (5 collision-checked question aliases: "minimum sound shell", "how thick sound wood", ...);
the calc-arborist `ARBORIST_RENDERERS` map entry via a hand-written renderer (two number fields) and the id added to the
calc-arborist declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeTrunkDecayStrength` across a diameter/loss sweep, the larger-loss-thinner-shell monotonicity, the Mattheck flag,
and the error seams. The calc-arborist.js gzip cap (raised to 17500 B in this spec) covers the addition. Verify at build,
including `check-shells`. Lazy-loaded, absent from home first paint. Home tile count 1,178 -> 1,179.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 4.0 in for a 24 in trunk
held to a 29.6% loss).

## 5. Roadmap position

Pairs the forward decay tile (`trunk-decay-strength`, loss from the shell) with its inverse (the shell for a loss), the
two halves of the hollow-trunk screen. Continues Explore sweep #12; further Group L arborist growth stays evidence-driven.
