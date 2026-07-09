# roughlogic.com Specification v544 -- Two-Leg Bridle Leg Tension (calc-rigging.js, Group Z, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-rigging.js`**
> (Group Z, rigging and heavy lift); no new module, group, or dependency. Inherits spec.md through spec-v543.md.
>
> **The gap, and the evidence for it.** `multi-leg-sling` assumes a symmetric rigid load shared over its legs, but the
> entertainment-rigging bridle is the **asymmetric** case: a single hang point pulled up to two beams at different
> distances and different heights. The two legs almost never carry half the load each -- the geometry splits the
> vertical load unequally, and the steeper or shorter leg can carry far more than an even share. Worse, a **shallow**
> bridle (legs closer to horizontal than vertical) multiplies tension fast, so each leg can exceed the hung load itself,
> while pushing a large horizontal pull into the structure. The bench has no tile for this everyday rigging problem. The
> tile takes the apex load and the horizontal run and vertical rise to each of the two attachment points, resolves the
> statics, and returns each leg's tension and angle and the horizontal reaction at the beams -- the numbers that size the
> bridle legs and check the structure.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The apex load and the leg
tensions and horizontal reaction are forces (`M L T^-2`, in lb); the horizontal runs, vertical rises, and computed leg
lengths are lengths (`L`); the direction cosines and angles (degrees) are `dimensionless`. The v18/v21 contract: any
non-finite input, a non-positive load, or a non-positive horizontal run or vertical rise on either leg (a leg needs both
components to be a bridle) returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the bridle
statics by name (entertainment rigging bridle geometry); `editionNote` names the **asymmetric two-leg bridle
resolution**, prints `L = sqrt(run^2 + rise^2)` per leg, the direction cosines `a = run/L` and `b = rise/L`, and the
solved `T1 = W x a2 / (a2 b1 + a1 b2)` and `T2 = W x a1 / (a2 b1 + a1 b2)` from horizontal and vertical equilibrium, and
states that **an off-center or unequal-height apex makes the two legs carry unequal tension (the steeper or shorter leg
carries more), a shallow bridle multiplies leg tension so a leg can exceed the hung load and drives a large horizontal
pull into the beams, this is a static two-dimensional resolution (a three-point bridle or out-of-plane geometry
differs), and the hardware ratings and a qualified rigger govern** -- a design aid, not a rigging sign-off.

## 2. The tile

### 2.1 `bridle-leg-tension` -- Why the Two Legs of an Asymmetric Bridle Never Carry Half Each

```
inputs:
  apex_load_lb   lb    load hung at the bridle apex
  run1_ft        ft    horizontal run from apex to attachment point 1
  rise1_ft       ft    vertical rise from apex to point 1
  run2_ft        ft    horizontal run to point 2 (opposite side)
  rise2_ft       ft    vertical rise to point 2

L1 = sqrt(run1^2 + rise1^2);  a1 = run1/L1;  b1 = rise1/L1
L2 = sqrt(run2^2 + rise2^2);  a2 = run2/L2;  b2 = rise2/L2
den = a2 x b1 + a1 x b2
T1  = apex_load_lb x a2 / den                          [lb]
T2  = apex_load_lb x a1 / den                          [lb]
H   = T1 x a1  (= T2 x a2)                              [lb]   horizontal reaction at the beams
```

**Pinned worked example (a 1,000 lb load; leg 1 runs 4 ft out and 8 ft up, leg 2 runs 10 ft out and 6 ft up).** Leg 1 is
`sqrt(4^2+8^2) = 8.94 ft` (steep, 63 degrees), leg 2 is `sqrt(10^2+6^2) = 11.66 ft` (shallow, 31 degrees). Resolving the
statics, the steeper leg 1 carries `T1 = ` **860 lb** and the shallower leg 2 carries `T2 = ` **449 lb** -- not 500 each;
the steeper leg takes far more, and the horizontal pull at each beam is **385 lb**. **Cross-check (a shallow bridle
drives both legs above the load).** Hang the same 1,000 lb from a low bridle -- leg 1 at 12 ft out / 4 ft up, leg 2 at
12 ft out / 5 ft up: both legs go nearly horizontal, and each tension climbs to about `T1 = ` **1,406 lb** and
`T2 = ` **1,444 lb** -- each leg now exceeds the hung load, and the horizontal beam reaction is enormous, the exact
danger of a shallow bridle. The tile returns each leg's length, angle, and tension and the horizontal reaction.

## 3. Wiring

A `tools-data.js` row (group `Z`, trades `["rigging", "stage"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the asymmetric example + the
shallow-bridle cross-check); `test/fixtures/compute-map.js` (`bridle-leg-tension` -> `computeBridleLegTension` in
`../../calc-rigging.js`); `scripts/related-tiles.mjs` (-> `multi-leg-sling` / `sling-angle` / `counterweight-arbor-load`);
`data/search/aliases.json` ("bridle tension", "two leg bridle", "asymmetric bridle", "bridle leg load", "rigging bridle
geometry", "apex load split", "shallow bridle", "bridle horizontal pull"); the id appended to the rigging renderers
declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block
pinning both examples, the unequal-leg split, the horizontal-equilibrium check (T1 a1 = T2 a2), the shallow-bridle
multiplication above the load, and the error seams (non-finite, non-positive load / run / rise). Hand-writes its
renderer (mirroring the calc-rigging.js `multi-leg-sling` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the leg-1 / leg-2 / horizontal stack wraps on a phone); render-no-nan + a11y on the new tile,
output read to the value (the asymmetric example -> 860 lb and 449 lb).

## 5. Roadmap position

Adds the asymmetric bridle beside `multi-leg-sling` (the symmetric shared-load case) and `sling-angle`. A three-point
(pick-and-two-bridle) resolution and a beam-clamp / horizontal-reaction capacity check are deliberate future follow-ons.
Further Group Z growth stays evidence-driven.
