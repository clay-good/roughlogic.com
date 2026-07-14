# roughlogic.com Specification v664 -- Absorption Needed for a Target RT60 (calc-stage.js, Group N, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-stage.js`** (Group N,
> live-production / AV), no new module, group, or dependency. Inherits spec.md through spec-v638.md.
>
> **The gap, and the evidence for it.** Spec-v120 (`room-acoustics`) runs the Sabine equation forward: given a room's
> volume and its total absorption, it returns the reverberation time `RT60 = 0.049 x V / A`. The everyday design
> question is the inverse -- an acoustician has a *target* RT60 (0.6 s for a control room, 1.0 s for a lecture hall) and
> needs to know how much absorption the room must have to hit it, and how much treatment to add over what the bare room
> already provides. That is `A_required = 0.049 x V / RT60_target` sabins, with the extra to install being
> `max(0, A_required - A_existing)`. The forward tile never returns it; you would have to guess absorption values and
> iterate the RT60 until it matched. The number this settles: a **5,000 ft^3** room targeting **0.6 s** needs **408
> sabins**; with **250 sabins** already present, add **158 sabins** of treatment (about 200 ft^2 of a panel at
> coefficient 0.8). This is the algebraic inverse of a shipped tile, the dominant clean vein in the catalog.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`room-acoustics` Sabine sibling: the volume is `L^3` (ft^3), the target RT60 is a time `T` (s), and the sabin totals
(required, additional, existing) are areas `L^2` -- one sabin is one square foot of perfect absorption, exactly as the
forward tile labels `total_sabins`. The Sabine coefficient `0.049` is the imperial constant (ft and ft^3), a bundled
editable field matching the forward tile's default. The v18/v21 contract: any non-finite input, or a non-positive
volume / target RT60 / coefficient, or a negative existing absorption, returns `{ error }`. Citation discipline
(v19/v22): W.C. Sabine's reverberation equation (public domain), solved for the required absorption; the note states
that **this sizes the absorption to meet the RT60 target, one sabin converts to treated area by dividing the added
sabins by the material's absorption coefficient, it does not move the axial room modes (geometry sets those, the
forward `room-acoustics` tile reports them) or place the treatment, and the acoustician and the venue govern**.

## 2. The tile

### 2.1 `room-absorption-target` -- Absorption Needed for a Target RT60

```
inputs:
  volume_ft3      ft^3   room volume (> 0)
  target_rt60_s   s      target reverberation time (> 0)
  existing_sabins sabins current total absorption (>= 0, default 0)
  sabine_coeff    -      Sabine constant (> 0, default 0.049)

A_required   = sabine_coeff x volume_ft3 / target_rt60_s     [sabins]
A_additional = max(0, A_required - existing_sabins)          [sabins]
meets_already = existing_sabins >= A_required
```

**Pinned worked example (a 5,000 ft^3 room to 0.6 s).** V = 5,000 ft^3, RT60 = 0.6 s, existing = 250 sabins:
`A_required = 0.049 x 5000 / 0.6 = 245/0.6 = ` **408.33 sabins**, `A_additional = 408.33 - 250 = ` **158.33 sabins** to
add; it does not yet meet the target. **Cross-check (a tighter target).** Same room to RT60 = 0.4 s:
`A_required = 0.049 x 5000 / 0.4 = ` **612.5 sabins**, `A_additional = 612.5 - 250 = ` **362.5 sabins** -- a tighter
target needs proportionally more absorption (`A ~ 1/RT60`). Feeding `A_required` back through `room-acoustics`
reproduces the target RT60 exactly, which the fuzzer round-trips across the venue sweep.

## 3. Wiring

A `tools-data.js` row (group `N`, trades `["live-production", "av"]`, beside `room-acoustics`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (Sabine, solved for absorption, the note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`room-absorption-target` ->
`computeRoomAbsorptionTarget` in `../../calc-stage.js`); `scripts/related-tiles.mjs` (-> `room-acoustics` /
`spl-distance` / `decibel-converter` / `spl-atmospheric`, and the forward tile links back); `data/search/aliases.json`
("absorption needed", "sabins required", "acoustic treatment sizing", "target rt60", plus adjacent rows);
`STAGE_RENDERERS["room-absorption-target"]` via the module's `_r` renderer factory (mirroring `room-acoustics`) and the
id added to the calc-stage declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + derivations; a `bounds-fuzzer.test.js` block pinning both examples, the already-met floor, the
round-trip through `computeRoomAcoustics`, and the error seams (non-finite, non-positive V / RT60 / coefficient,
negative existing). Group N has no exact audit-count assertion covering this section, so no count bump. The
calc-stage.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> required 408 sabins, additional 158 sabins).

## 5. Roadmap position

Pairs the forward Sabine tile (`room-acoustics`, RT60 from absorption) with its inverse (absorption from a target
RT60), the two halves of the venue-tuning question. Further Group N growth stays evidence-driven.
