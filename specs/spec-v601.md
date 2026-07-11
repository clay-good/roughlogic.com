# roughlogic.com Specification v601 -- Iowa Rate-of-Flow Fire Flow (calc-fire.js, Group F, 1 New Tile)

> **Status: PROPOSED (2026-07-10). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fire.js`**
> (Group F, the fire-ground engineering bench); no new module, group, or dependency. Inherits spec.md through
> spec-v600.md.
>
> **The gap, and the evidence for it.** Spec-v577 (`nfa-fireground-flow`) names this tile as a deliberate follow-on:
> "an Iowa/Royer-Nelson rate-of-flow (volume method) alternative." The bench has the area-based National Fire Academy
> quick-calc but not the older volume-based method every fire-behavior class still teaches beside it, and the two
> answer different questions. The **Iowa rate-of-flow formula** (Royer and Nelson, Iowa State) comes from the physics
> of steam: one gallon of water flashing to steam absorbs the heat in about **200 cubic feet** of a compartment, so the
> water to knock the fire down is the room volume over 200 gallons, and applying it in the 30-second burst the method
> assumes makes the **rate `gpm = volume / 100`.** A 20 by 30 by 10-foot room is 6,000 cubic feet: **30 gallons**
> total, a **60 gpm** rate. That is a fraction of what the NFA formula gives for the same footprint (200 gpm) -- and
> that gap is the teaching point: the Iowa number is the brief, high-efficiency **interior knockdown burst** for a
> confined volume, while the NFA number is the **sustained** flow for the whole operation. The tile gives the
> volume-method figure so an instructor or a company officer can set it beside the area method and understand why they
> differ, instead of trusting one blindly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The room length, width,
and height are `L` (ft), the compartment volume `L^3` (ft^3), the total water `L^3` (gal), and the rate a flow
`L^3 T^-1` (gpm), the last three carried dimensionless to the parse-only lint alongside the `nfa-fireground-flow`
sibling. The v18/v21 contract: any non-finite input, or a non-positive length, width, or height returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the Iowa rate-of-flow formula by name (Royer-Nelson / Iowa
State fire-behavior practice, matching the `nfa-fireground-flow` sibling); `editionNote` prints
`volume_ft3 = length x width x height`, `total_gal = volume_ft3 / 200`, and `rate_gpm = volume_ft3 / 100`, and states
that **the formula is a 30-second confined-compartment knockdown burst for a single open area (not a sustained supply,
which the NFA and ISO methods size), it assumes fog application filling the space and a single undivided volume, the
200-cubic-feet-per-gallon steam basis carries the built-in margin, and incident command governs** -- a fire-behavior
teaching and size-up aid, not a water-supply design.

## 2. The tile

### 2.1 `iowa-rate-of-flow` -- Volume-Method Knockdown Flow (Royer-Nelson)

```
inputs:
  length_ft   ft   compartment length
  width_ft    ft   compartment width
  height_ft   ft   compartment height (ceiling)

volume_ft3 = length_ft x width_ft x height_ft     [ft3]
total_gal  = volume_ft3 / 200                      [gal]  (1 gal controls ~200 ft3 of compartment)
rate_gpm   = volume_ft3 / 100                       [gpm]  (that water applied in the 30-second burst)
```

**Pinned worked example (a 20 by 30 by 10-foot room).**
`volume = 20 x 30 x 10 = 6,000 ft^3`, so `total = 6,000 / 200 = ` **30 gallons** to control the space and
`rate = 6,000 / 100 = ` **60 gpm** delivered in the 30-second knockdown -- far below the 200 gpm the NFA area formula
gives for the same 20 by 30 footprint, because the Iowa number is a brief interior burst and the NFA number is a
sustained operational flow. **Cross-check (a small bedroom, 15 by 15 by 8 ft).**
`volume = 15 x 15 x 8 = 1,800 ft^3`, `total = 1,800 / 200 = ` **9 gallons**, `rate = 1,800 / 100 = ` **18 gpm** -- a
single interior line easily covers it, which is the whole point of the confined-volume knockdown concept.

## 3. Wiring

A `tools-data.js` row (group `F`, trades `["fire"]`, placed inside the Group F comment block after
`nfa-fireground-flow` -- the `citations.test.js` **Group F audit count bumps 33 -> 34**); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (both
examples); `test/fixtures/compute-map.js` (`iowa-rate-of-flow` -> `computeIowaRateOfFlow` in `../../calc-fire.js`);
`scripts/related-tiles.mjs` (-> `nfa-fireground-flow` / `required-fire-flow` / `iso-nff`); `data/search/aliases.json`
("iowa rate of flow", "royer nelson fire flow", "volume method fire flow", "iowa formula", "compartment knockdown
flow", plus question rows); the id appended to the calc-fire declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples,
the volume-to-flow relation, and the error seams (non-finite, non-positive length / width / height). Renderer
hand-written mirroring the `nfa-fireground-flow` pattern (`makeNumber` / `makeOutputLine`). Lazy-loaded, absent from
home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2
fixtures, the new fuzzer block, the Group F audit count bump); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value (the 6,000 ft^3 example
-> 30 gal / 60 gpm).

## 5. Roadmap position

Gives `nfa-fireground-flow` its volume-method counterpart, letting the fireground area and volume estimates sit side by
side with `required-fire-flow` and `iso-nff` for the sustained-supply picture. The v577-named per-floor breakdown
remains a deliberate future follow-on. Further Group F growth stays evidence-driven.
