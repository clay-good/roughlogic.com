# roughlogic.com Specification v282 -- Steel Block Shear Rupture at a Bolted/Coped End (AISC 360 J4.3) (calc-steel.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.100.0; proposed 2026-07-02). Batch spec-v281..v283 (the steel members-and-connections depth trio --
> LTB (v281), block shear (this spec, the "separate check" `steel-beam-shear` names), the tension member (v283)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `steel-beam-shear` ends "Block shear at a coped end
> is a separate check" -- that check is this gap. Block shear is the rupture failure that pulls a tab of steel out of a
> bolted connection or a coped beam web along a combined tension-and-shear tear path, and it frequently governs a
> connection over the bolt or weld capacity. Adds one tile to the existing **`calc-steel.js`** module (Group E); no new
> group, trade, or dependency. Inherits spec.md through spec-v281.md.
>
> **The gap, and the evidence for it.** AISC 360 Section J4.3 takes the block-shear rupture strength as
> `Rn = 0.6 Fu Anv + Ubs Fu Ant <= 0.6 Fy Agv + Ubs Fu Ant` -- rupture on the net shear plane plus rupture on the net
> tension plane, capped by yielding on the gross shear plane plus tension rupture -- with `Ubs = 1.0` for a uniform tension
> stress (the usual single-row case) and `phi = 0.75` / `Omega = 2.00`. For a 1/2 in A36 plate bolted with three 3/4 in
> bolts in one line at 3 in spacing, a 1.5 in end distance, and a 1.5 in tension edge distance (standard 7/8 in holes), the
> net-shear path gives `0.6 x 58 x 2.656 + 58 x 0.531 = 123.2 kip`, but the gross-shear-yield cap
> `0.6 x 36 x 3.75 + 58 x 0.531 = 111.8 kip` governs, so `Rn = 111.8 kip` -- ASD 55.9, LRFD 83.9. `steel-beam-shear` sizes
> the web on the gross section; this tile sizes the tear-out at the holes, the check that decides how far the end and edge
> distances must go.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The element thickness `t`, the
bolt-hole diameter `dh`, the bolt spacing `s`, and the end and tension edge distances are lengths (in); the number of bolts
`n` in the line is a dimensionless count; `Fy` and `Fu` are stresses (ksi); `Ubs` is the dimensionless uniformity factor
(1.0 or 0.5); the gross/net shear and tension areas are areas (in^2); the nominal, ASD, and LRFD strengths are forces
(kip). The v18/v21 contract: any non-finite input, a thickness/length at or below zero, or a bolt count below one returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the AISC 360 J4.3 block-shear provisions by name;
`editionNote` names **the AISC 360-22 Section J4.3 block-shear strength `Rn = 0.6 Fu Anv + Ubs Fu Ant` capped by
`0.6 Fy Agv + Ubs Fu Ant`, with `Ubs = 1.0` for uniform tension and `phi = 0.75` / `Omega = 2.00`, and the net-area
deduction of one hole diameter per bolt on the shear plane (the last hole counted as a half on the shear tear) and a half
hole on the tension plane**, and states that **this covers a single tension-plane, single shear-line block (one bolt row) --
it assumes standard holes with `dh` = bolt diameter + 1/8 in unless entered, does not chain multiple rows or a re-entrant
coped-beam geometry (enter the governing block by hand), and does not check the bolt shear/bearing (`bolt-shear-bearing`) or
the net-section tension member (`steel-tension-member`); and this is a design aid, not a substitute for the engineer of
record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `steel-block-shear` -- Steel Block Shear Rupture (AISC 360 J4.3)

```
inputs:
  t_in     in    element thickness (plate or beam web)
  Fy       ksi   yield stress
  Fu       ksi   tensile stress
  n        -     bolts in the shear line
  s_in     in    bolt spacing (pitch)
  end_in   in    end distance (first bolt to the sheared end)
  edge_in  in    tension edge distance (bolt line to the tension edge)
  dh_in    in    bolt-hole diameter (default bolt dia + 1/8)
  Ubs      -     tension-uniformity factor (default 1.0)

Lgv = end_in + (n - 1) * s_in                 ; gross shear path length, in
Agv = Lgv * t_in                              ; gross shear area
Anv = (Lgv - (n - 0.5) * dh_in) * t_in        ; net shear area
Ant = (edge_in - 0.5 * dh_in) * t_in          ; net tension area
Rn  = min( 0.6*Fu*Anv + Ubs*Fu*Ant ,          ; rupture path
           0.6*Fy*Agv + Ubs*Fu*Ant )          ; gross-shear-yield cap
ASD = Rn / 2.00 ; LRFD = 0.75 * Rn
```

**Pinned worked example (a 1/2 in A36 plate, three 3/4 in bolts in one line).** `t = 0.5`, `Fy = 36`, `Fu = 58`, `n = 3`,
`s = 3`, `end = 1.5`, `edge = 1.5`, `dh = 0.875`, `Ubs = 1.0`: `Lgv = 1.5 + 2 x 3 = 7.5 in`; `Agv = 3.75 in^2`;
`Anv = (7.5 - 2.5 x 0.875) x 0.5 = 2.656 in^2`; `Ant = (1.5 - 0.4375) x 0.5 = 0.531 in^2`; rupture path
`0.6 x 58 x 2.656 + 58 x 0.531 = 123.2 kip`; gross-shear-yield cap `0.6 x 36 x 3.75 + 58 x 0.531 = 111.8 kip`, which governs,
so `Rn = 111.8 kip`, ASD `= 55.9 kip`, LRFD `= 83.9 kip`. **Cross-check (shorten the end distance to 1.25 in).** Hold the
rest: `Lgv = 1.25 + 6 = 7.25 in`; `Anv = (7.25 - 2.1875) x 0.5 = 2.531 in^2`; `Agv = 3.625 in^2`; rupture path `118.0 kip`,
cap `0.6 x 36 x 3.625 + 30.8 = 109.1 kip` governs -- a tighter end distance drops the block-shear capacity, the reason the
detail sheet holds the edge distances. The non-finite, non-positive-dimension, and `n < 1` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["welding","construction"]`, matching the steel connection tiles); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the AISC 360 J4.3 provisions, `editionNote`
naming `Rn = 0.6 Fu Anv + Ubs Fu Ant` capped by `0.6 Fy Agv + Ubs Fu Ant`, `Ubs`, the hole-deduction rule, and the
single-row, standard-hole, not-bolt-shear caveats); `test/fixtures/worked-examples.json` (the three-bolt example + the
shortened-end cross-check); `test/fixtures/compute-map.js` (`steel-block-shear` -> `computeSteelBlockShear` in
`../../calc-steel.js`); `scripts/related-tiles.mjs` (-> `steel-beam-shear` / `bolt-shear-bearing` / `steel-tension-member` /
`steel-beam-ltb`); `data/search/aliases.json` ("block shear", "block shear rupture", "coped beam block shear", "AISC J4.3",
"tear out steel", "gusset block shear", "shear tension rupture", "edge distance block shear", "bolt tear out"); the id
appended to the existing steel renderers block in `app.js`; the `// dims:` annotation (lengths in, `Fy`/`Fu` stress, `n`
dimensionless, areas area, strengths force); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the min() governing-path selection (rupture vs gross-yield cap), and the non-positive / `n < 1` / non-finite
error seams. No new module; re-pin `calc-steel.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home
first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the governing-path assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Anv` / `Ant` / `Rn` / ASD / LRFD
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (three 3/4 in bolts -> 111.8 kip, ASD 55.9).

## 5. Roadmap position

Middle of the steel depth batch (v281..v283) in `calc-steel.js`, closing the block-shear check `steel-beam-shear` defers.
The tension member (v283) follows. Multi-row block-shear geometry, the `Ubs = 0.5` nonuniform case, and the coped-beam
re-entrant corner with flexural interaction are the deliberate next follow-ons once the trio lands.
