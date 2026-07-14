# roughlogic.com Specification v714 -- Max Grounding-Grid Resistance for the GPR Screen (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v713.md. Sweep-10 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `ground-potential-rise` tile runs the IEEE 80 screen forward:
> from a grid current and grid resistance it returns the GPR and whether it clears the tolerable touch voltage. The
> design question is the inverse -- **what grid resistance target keeps the yard within the touch limit**. From
> `GPR = grid_current x grid_resistance` and the screen passing when `GPR <= tolerable_touch`, the inverse is
> `max_grid_resistance = tolerable_touch / grid_current`. The number this settles: a **200-V** touch limit with a
> **200-A** grid current needs a grid resistance of **1.0 ohm** or less.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`ground-potential-rise` sibling (which, per the module's convention, models voltage and resistance as dimensionless and
the grid current as `I`). The v18/v21 contract: any non-finite input, or a non-positive tolerable touch voltage or grid
current, returns `{ error }`. Citation discipline (v19/v22): the IEEE 80 GPR screen solved for the grid resistance,
`GOVERNANCE.general` matching the sibling; the note states that **the grid resistance must be at or below tolerable_touch
/ grid_current for the whole yard to clear without a mesh/step study, a lower resistance (more rods, a larger mesh, or
better soil) or a lower grid current is needed if the target is impractical, the grid current is the portion of fault
current returning through the grid to remote earth (not the total fault), and IEEE Std 80 and a qualified grounding study
govern -- a screen, not a grounding design**.

## 2. The tile

### 2.1 `max-grid-resistance-for-touch` -- Max Grounding-Grid Resistance for the GPR Screen (IEEE 80)

```
inputs:
  tolerable_touch_v   V (dimensionless in module convention)   tolerable touch voltage (> 0)
  grid_current_a      I                                        grid current I_G (> 0)

max_grid_resistance_ohm = tolerable_touch_v / grid_current_a
```

**Pinned worked example.** tolerable touch = 200 V, grid current = 200 A: `max_R_g = 200 / 200 = ` **1.0 ohm**; feeding a
1.0 ohm grid at 200 A back through `ground-potential-rise` returns a 200-V GPR, exactly at the tolerable touch, so the
screen passes (safe by the `<=` test). A larger grid current forces a lower resistance target.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) placed beside `ground-potential-rise` (Group A is un-audited);
a `tile-meta.js` `_TILES` entry; a `citations.js` entry (GPR screen solved for the resistance, `GOVERNANCE.general`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`max-grid-resistance-for-touch` -> `computeMaxGridResistanceForTouch`); `scripts/related-tiles.mjs`
(-> `ground-potential-rise` / `step-touch-voltage` / `neutral-grounding-resistor` / `grounding-electrode`);
`data/search/aliases.json` (5 collision-checked question aliases: "max grid resistance for touch voltage", "what grid
resistance passes ieee 80", ...); the calc-elecdesign `ELECDESIGN_RENDERERS` map entry via the shared `_simpleRenderer`
factory (two number fields) and the id added to the calc-elecdesign declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning the example, the round-trip through `computeGroundPotentialRise` (safe at the limit) across a touch/current
sweep, the larger-current-lower-resistance monotonicity, and the error seams. The calc-elecdesign.js gzip cap is raised
11000 -> 12500 B (the module was at 99.7%). Verify at build, including `check-shells`. Lazy-loaded, absent from home
first paint. Home tile count 1,162 -> 1,163.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 1.0 ohm for a 200-V touch
limit at a 200-A grid current).

## 5. Roadmap position

Pairs the forward GPR screen (`ground-potential-rise`, GPR from a resistance) with its inverse (resistance target from a
touch limit), the two halves of the IEEE 80 grid-resistance question. Further Group A electrical-design growth stays
evidence-driven.
