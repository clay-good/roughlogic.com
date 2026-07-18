# roughlogic.com Specification v962 -- Sheet-Metal Bend Springback (calc-fab.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-fab.js`** (Group E), no
> new module, group, or dependency. Inherits spec.md through spec-v961.md. Sheet-metal forming sweep, beside the accepted
> `min-bend-radius`, `bend-allowance`, and `press-brake-tonnage` tiles.
>
> **The gap, and the evidence for it.** The catalog has bend allowance, minimum radius, and press-brake tonnage, but
> nothing models the elastic SPRINGBACK that makes a released bend open up. Grep confirmed no springback / overbend tile.
> Every press-brake operator overbends to hit a target. The number this settles: a 1 in tool radius in 0.1 in, 50 ksi
> steel springs to **1.05 in** (Ks 0.948).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, since x mixes psi and inches into a dimensionless
group), bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input, a
non-positive tool radius / thickness / yield / modulus, or an out-of-range x (>= 0.5, where the cubic (2x-1)^2(x+1)
leaves its physical branch) returns `{ error }`. Citation discipline (v19/v22): the Machinery's Handbook springback
relation by name, `GOVERNANCE.general`; the note states that the released radius is larger than the die radius (so the
operator overbends), that E is ~29-30e6 psi steel / ~10e6 aluminum, and that the exact overbend depends on the tooling
method (air bend vs bottoming vs coining) -- the material certificate, the tooling method, and a test bend govern.

## 2. The tile

### 2.1 `bend-springback` -- Sheet-Metal Bend Springback

```
inputs:
  tool_radius_in      inside (tool) bend radius Ri (in), default 1.0
  thickness_in        material thickness T (in), default 0.1
  yield_strength_psi  yield strength (psi), default 50000
  modulus_psi         elastic modulus E (psi; ~29e6 steel, ~10e6 aluminum), default 29000000

x  = tool_radius_in x yield_strength_psi / (modulus_psi x thickness_in)    [must be < 0.5]
springback_factor_ks = 4 x^3 - 3 x + 1        [= Ri/Rf]
final_radius_in      = tool_radius_in / springback_factor_ks               [released radius, > tool radius]
```

**Pinned worked example.** 1 in tool radius, 0.1 in, 50 ksi steel (E 29e6): `x = 1 x 50000/(29e6 x 0.1) = 0.01724`, so
`Ks = 4x^3 - 3x + 1 = ` **0.9483** and the released radius is `1/0.9483 = ` **1.0545 in** -- about a 5% opening.
Cross-check: an aluminum part (E 10e6, 40 ksi) has a larger x (0.04) and springs back much more, **Ks 0.880**; a thicker
part springs back less.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["fabrication", "sheet-metal"]`, beside `min-bend-radius`); a `tile-meta.js`
`_TILES` entry (`E`); a `citations.js` entry (Machinery's Handbook springback, `GOVERNANCE.general`); `test/fixtures/
worked-examples.json` (the steel example plus the aluminum cross-check, pinning Ks and the released radius);
`test/fixtures/compute-map.js` (`bend-springback` -> `computeBendSpringback`, module `../../calc-fab.js`);
`scripts/related-tiles.mjs` (-> `min-bend-radius` / `bend-allowance` / `press-brake-tonnage`); `data/search/aliases.json`
(5 collision-checked aliases: "bend springback", "springback factor", "overbend", "sheet metal springback", "brake
springback"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the `FAB_RENDERERS` map (non-
exported, so no DOM-sentinel dims row), and the id added to the calc-fab declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js`
block pinning Ks and the released radius, the aluminum-springs-more and thicker-springs-less directions, and the error
seams (non-positive inputs, out-of-range x, non-finite). The calc-fab.js gzip cap is watched at build (raised for this
tile). Home tile count 1,410 -> 1,411.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1 in / 0.1 in / 50 ksi / 29e6 -> Ks 0.948, 1.055 in).

## 5. Roadmap position

Sheet-metal forming beside `min-bend-radius`, serving the fabricator / press-brake operator (fabrication / sheet-metal).
Deliberately the elastic-recovery radius relation; the tooling method (air bend / bottoming / coining), grain direction,
press, material certificate, and a test bend govern the actual overbend. Stays evidence-driven. Continues the sheet-metal
forming sweep at 1 new spec (v962).
