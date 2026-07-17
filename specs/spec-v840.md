# roughlogic.com Specification v840 -- Internal Vibrator Spacing (ACI 309) (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v839.md. Concrete-operations sweep, beside
> `concrete-pour-rate` and the formwork tiles.
>
> **The gap, and the evidence for it.** Nothing spaces the **internal vibrator** insertions that consolidate fresh
> concrete, where ACI 309 caps the spacing at 1.5 times the vibrator's radius of action and keeps the head within 0.75 of
> that radius of the form. Grep confirmed no vibrator / consolidation tile. The number this settles: a head with a 12 in
> radius of action spaces at **18 in**, stays within **9 in** of the form, and a 20 ft wall lift takes about **14**
> insertion points -- the plan that prevents honeycomb without over-vibrating.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
concrete siblings (`concrete-pour-rate`, `control-joint-spacing`): the radius of action and lift length carry `L`, the
spacing and edge distance are `L`, and the insertion count is dimensionless. The v18/v21 contract: a non-finite or
non-positive radius of action or lift length returns `{ error }`. Citation discipline (v19/v22): the ACI 309 spacing rule
by name (max spacing = 1.5 x radius of action; edge distance <= 0.75 x radius of action; insertions = ceil(lift length /
spacing)), `GOVERNANCE.general`; the note states that the radius of action comes from the vibrator manufacturer for the
head diameter and the mix, that the head is inserted vertically with the action circles overlapping and withdrawn slowly,
that over-vibration segregates the mix, and that ACI 309 governs the practice.

## 2. The tile

### 2.1 `concrete-vibrator-spacing` -- Internal Vibrator Spacing (ACI 309)

```
inputs:
  radius_of_action_in  vibrator radius of action R (in)
  lift_length_ft       length of the lift/run to consolidate (ft)

max_spacing_in = 1.5 * radius_of_action_in
edge_max_in    = 0.75 * radius_of_action_in
insertions     = ceil(lift_length_ft * 12 / max_spacing_in)
```

**Pinned worked example.** Radius of action 12 in, lift 20 ft:
`spacing = 1.5 * 12 = ` **18 in**; `edge = 0.75 * 12 = ` **9 in**; `insertions = ceil(20*12 / 18) = ceil(13.3) = ` **14**.
Cross-check: a smaller 8 in radius head (leaner mix, smaller diameter) tightens the spacing to `1.5*8 = ` **12 in** and
raises the count to `ceil(240/12) = ` **20** -- the head's radius of action, not the wall, sets how many stabs it takes.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "concrete"]`, inside the `// Group E` construction block near
`concrete-pour-rate`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (spacing = 1.5 R; edge = 0.75 R [ACI 309], `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the smaller-head cross-check); `test/fixtures/compute-map.js` (`concrete-vibrator-spacing` ->
`computeConcreteVibratorSpacing`, module `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `concrete-pour-rate`
/ `formwork-pressure` / `concrete`); `data/search/aliases.json` (5 collision-checked aliases: "vibrator spacing", "concrete
consolidation spacing", "internal vibrator insertions", "aci 309 vibration", "radius of action spacing"); a hand-written
renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `control-joint-spacing` renderer (non-exported, so no
DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the spacing, edge distance, insertion count, and the error seams (non-positive radius or lift length). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,288 -> 1,289.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1.5 * 12 -> 18 in spacing, 14 insertions over 20 ft).

## 5. Roadmap position

Concrete-operations tile beside `concrete-pour-rate` and the formwork family, serving the concrete finisher and foreman
(construction / concrete). Stays evidence-driven; ACI 309 and the vibrator manufacturer govern.
