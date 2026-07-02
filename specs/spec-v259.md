# roughlogic.com Specification v259 -- Rebar Tension Development Length (ACI 318-19 §25.4.2) (calc-concrete.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02). Batch spec-v257..v259 (the ACI 318-19 reinforced-concrete member trio). This spec
> closes the batch with the bar-development check -- the length of embedment that lets a bar reach its yield stress, which
> is what makes the flexural and shear steel of v257 and v258 actually work.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog has `rebar-lap-splice`, but that tile is
> the jobsite 40-to-48-bar-diameter rule of thumb with a 12 in floor, not the ACI 318-19 §25.4.2.3 development-length
> equation with its casting-position, coating, size, grade, and confinement factors. Adds one tile to the
> **`calc-concrete.js`** Group E cluster opened by v257; no new group, trade, or dependency. Inherits spec.md through
> spec-v258.md.
>
> **The gap, and the evidence for it.** A reinforcing bar develops its force only through bond over an embedment length,
> and ACI 318-19 §25.4.2.3 sets that tension development length with one general equation:
> `ld = (3/40) x [fy x psi_t x psi_e x psi_s x psi_g] / [lambda x sqrt(f'c) x ((cb + Ktr)/db)] x db`, with the confinement
> term `(cb + Ktr)/db` capped at 2.5 (§25.4.2.4) and `ld` not less than 12 in (§25.4.2.1). The product `psi_t x psi_e` is
> itself capped at 1.7 (§25.4.2.5). A #8 Grade 60 uncoated bottom bar in 4,000 psi normalweight concrete, well confined,
> develops in about 28 in -- and the same bar cast as a top bar jumps to 37 in, the 1.3 casting-position penalty that
> catches detailers who read the bottom-bar value off a chart. The lap-splice tile gives the shop a rule of thumb; this
> gives the actual code length the flexural and shear steel of v257 and v258 depend on.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The concrete strength `f'c`
and bar yield `fy` are stresses (psi); the bar diameter `db` and the development length `ld` are lengths (in); the
confinement term `(cb + Ktr)/db` and every `psi` factor and `lambda` are counts (`dimensionless`). The v18/v21 contract:
any non-finite input, or a concrete strength, yield, or bar diameter at or below zero, or a confinement term at or below
zero, returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the development relation by name;
`editionNote` names **ACI 318-19 §25.4.2.3 (the general tension development-length equation), §25.4.2.4 (the `(cb+Ktr)/db`
confinement term, capped at 2.5), §25.4.2.5 / Table 25.4.2.5 (the modification factors `psi_t` casting position 1.3 top /
1.0 other, `psi_e` coating 1.5 or 1.2 epoxy / 1.0 uncoated, `psi_s` size 0.8 for #6 and smaller / 1.0 for #7 and larger,
`psi_g` grade 1.0 Gr 60 / 1.15 Gr 80 / 1.3 Gr 100, and the `psi_t x psi_e <= 1.7` cap), and §25.4.2.1 (the 12 in
minimum)**, gives `fy` a default of **60,000 psi (Grade 60, `psi_g = 1.0`)**, `lambda` a default of **1.0 (normalweight;
0.75 lightweight)**, and the confinement term a default of **2.5 (the well-confined maximum)**, and states that **the
`psi` factors are user-selected inputs, not derived here (the tool does not read cover, spacing, or transverse
reinforcement to compute `cb` or `Ktr`); this is straight-bar tension development, not a standard hook (§25.4.3), a
compression bar (§25.4.9), or a lap splice (§25.5, see `rebar-lap-splice`); and this is a design aid, not a substitute
for a licensed engineer's design** -- the engineer of record's detailing governs.

## 2. The tile

### 2.1 `rc-development-length` -- Rebar Tension Development Length (ACI 318-19)

```
inputs:
  fc          psi     specified concrete compressive strength (default 4000)
  fy          psi     bar yield strength (default 60000, Grade 60)
  db          in      bar diameter (e.g. #8 = 1.00 in)
  psi_t       -       casting-position factor (1.3 top bar, 1.0 other; default 1.0)
  psi_e       -       coating factor (1.5 / 1.2 epoxy, 1.0 uncoated; default 1.0)
  psi_s       -       bar-size factor (0.8 for #6 and smaller, 1.0 for #7 and larger; default 1.0)
  psi_g       -       grade factor (1.0 Gr 60, 1.15 Gr 80, 1.3 Gr 100; default 1.0)
  lambda      -       lightweight factor (1.0 normalweight, 0.75 lightweight; default 1.0)
  conf        -       confinement term (cb + Ktr)/db, capped at 2.5 (default 2.5)

te         = min(psi_t * psi_e, 1.7)                              ; capped position*coating product
conf_eff   = min(conf, 2.5)                                        ; confinement term cap
ld_calc    = (3/40) * fy * te * psi_s * psi_g
           / (lambda * sqrt(fc) * conf_eff) * db                   ; development length, in
ld_in      = max(ld_calc, 12)                                      ; 12 in floor
ld_db      = ld_in / db                                            ; length as bar diameters
```

**Pinned worked example (a #8 Grade 60 bottom bar, well confined).** `f'c = 4,000 psi`, `fy = 60,000 psi`, `db = 1.00 in`
(#8), `psi_t = psi_e = psi_s = psi_g = lambda = 1.0`, `conf = 2.5`: `te = 1.0`; `ld = (3/40) x 60,000 x 1.0 x 1.0 x 1.0 /
(1.0 x sqrt(4,000) x 2.5) x 1.00 = 0.075 x 60,000 / (63.25 x 2.5) = 4,500 / 158.1 = ` **28.5 in** (about 28 bar diameters),
well over the 12 in floor. **Cross-check (the same bar cast as a top bar).** Everything the same but `psi_t = 1.3` (more
than 12 in of fresh concrete below): `te = min(1.3 x 1.0, 1.7) = 1.3`; `ld = 28.5 x 1.3 = ` **37.0 in** -- the 30% casting
penalty that turns a 28 in bottom-bar embedment into 37 in on top, the exact trap the general equation exists to catch and
the jobsite `40 db` rule of thumb (`rebar-lap-splice`) papers over.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the development relation, `editionNote` naming ACI 318-19 §25.4.2.3 / §25.4.2.4 / §25.4.2.5 /
Table 25.4.2.5 / §25.4.2.1 with the user-selected-`psi`, straight-bar-only, and design-aid caveats);
`test/fixtures/worked-examples.json` (the #8 bottom-bar example + the #8 top-bar cross-check);
`test/fixtures/compute-map.js` (`rc-development-length` -> `computeRcDevelopmentLength` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rebar-lap-splice` / `rc-beam-flexure` / `rebar-schedule`); `data/search/aliases.json`
("development length", "rebar embedment", "ACI 318 ld", "bar development", "psi t psi e psi s psi g", "tension development
length", "how long to develop rebar", "top bar factor"); the id appended to the concrete renderers declare in `app.js`;
the `// dims:` annotation (`fc`/`fy` pressure, `db`/`ld` length, all `psi`/`lambda`/`conf`/`ld_db` dimensionless);
regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite,
`fc <= 0`, `fy <= 0`, `db <= 0`, `conf <= 0`) plus the `psi_t x psi_e = 1.7` cap boundary, the `conf > 2.5` cap boundary,
and the 12 in floor. Re-pin the `calc-concrete.js` size in the `check:module-sizes` allowlist (dated comment). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the four non-positive error paths, the two caps, and the 12 in floor); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the te / ld / ld-in-db
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (#8 bottom bar at f'c 4000, well confined ->
28.5 in; top bar -> 37 in).

## 5. Roadmap position

Closes the ACI 318-19 reinforced-concrete member batch (v257..v259). Development length completes the loop opened by the
flexural (v257) and shear (v258) member checks -- the bars they size must develop their force, and this is that length.
A standard-hook development length (§25.4.3, `ldh`), a compression development length (§25.4.9), and a class-A/B tension
lap-splice upgrade of `rebar-lap-splice` onto this ACI basis (§25.5.2) are the deliberate next follow-ons, and with the
member trio landed the reinforced-concrete design cluster stands beside the steel-member (v254..v256) and building-code
(v242..v253) clusters as a complete Group E structural set.
