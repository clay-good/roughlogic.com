# roughlogic.com Specification v257 -- Reinforced Concrete Beam Flexural Capacity (ACI 318-19 Ch. 22) (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-02, package 0.94.0; was PROPOSED 2026-07-02). Batch spec-v257..v259 (the ACI 318-19 reinforced-concrete member trio -- the three
> strength checks a general contractor, precaster, or engineer runs on a rectangular RC beam: does it carry the moment,
> does it carry the shear, and does the rebar develop the bar force. This spec opens the batch with the flexural check.)**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog already places and cures the concrete
> (`concrete`, `concrete-mix-design`, `concrete-evaporation-rate`, `concrete-strength-gain`) and counts the rebar
> (`rebar`, `rebar-schedule`, `rebar-lap-splice`), and the steel batch (v254..v256) checks the steel *member*, but nothing
> checks the reinforced-concrete *member itself*. Adds one tile to a new **`calc-concrete.js`** Group E cluster (ACI 318-19
> rectangular-section member capacity, beside the concrete-placement and steel-member tiles); no new group, trade, or
> dependency. Inherits spec.md through spec-v256.md.
>
> **The gap, and the evidence for it.** The first strength question on any concrete-framed job is whether the beam holds
> the moment. ACI 318-19 §22.2 makes the answer a two-line calculation for the common case -- a singly-reinforced,
> tension-controlled rectangular section reaches a nominal moment `Mn = As x fy x (d - a/2)`, where the equivalent
> stress-block depth is `a = As x fy / (0.85 x f'c x b)` (§22.2.2.4.1), and the design moment is that times the
> tension-controlled strength-reduction factor `phi = 0.90` (§21.2.2). A 12-by-24 in beam with three #9 bars of Grade 60
> steel on 4,000 psi concrete develops a design moment of about 260 kip-ft -- the value every reinforced-concrete textbook
> prints for that section. The catalog can compute the mix, the cure, and the rebar takeoff, but not this, the single
> number that decides whether the reinforced section on the drawing is big enough.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The concrete strength `f'c`
and steel yield `fy` are stresses (psi); the steel area `As` is an area (in^2); the beam width `b` and effective depth `d`
are lengths (in); the stress-block depth `a` is a length (in); the nominal and design moments are a moment (force x
length, reported in kip-ft after the in-lb-to-kip-ft divide by 12,000). The v18/v21 contract: any non-finite input, or a
concrete strength, yield, steel area, width, or effective depth at or below zero, returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the flexural relation by name; `editionNote` names **ACI 318-19 §22.2.2.4.1
(equivalent rectangular stress block, `a = As x fy / (0.85 x f'c x b)`), §22.2 (`Mn = As x fy x (d - a/2)`), and §21.2.2
(the strength-reduction factor `phi = 0.90` for a tension-controlled section)**, gives `fy` a default of **60,000 psi
(Grade 60, the standard deformed-bar grade)**, and states that **this covers only a singly-reinforced rectangular section
assumed tension-controlled -- the user must confirm the net tensile strain `epsilon_t` is at least 0.005 (§21.2.2), and
compression reinforcement, T-beam flange action, minimum steel (§9.6.1.2), and shear (v258) are not checked here; take
`As` and `d` from the reinforcement schedule for the actual section; and this is a design aid, not a substitute for a
licensed engineer's design** -- the engineer of record's stamped design governs.

## 2. The tile

### 2.1 `rc-beam-flexure` -- Reinforced Concrete Beam Flexural Capacity (Singly-Reinforced, Tension-Controlled)

```
inputs:
  fc        psi     specified concrete compressive strength (default 4000)
  fy        psi     specified steel yield strength (default 60000, Grade 60)
  as_in2    in^2    area of tension reinforcement
  b         in      beam width
  d         in      effective depth (extreme compression fiber to tension-steel centroid)
  mu        kip-ft  applied required moment to check against (optional, default 0 = capacity only)

a_in       = (as_in2 * fy) / (0.85 * fc * b)        ; stress-block depth, in
mn_kipin   = as_in2 * fy * (d - a_in / 2) / 1000     ; nominal moment, kip-in
mn_kipft   = mn_kipin / 12                            ; nominal moment, kip-ft
phi_mn     = 0.90 * mn_kipft                          ; design moment, kip-ft
util       = mu > 0 ? mu / phi_mn : -                 ; demand/capacity ratio
```

**Pinned worked example (a 12x24 floor beam, three #9 bars).** `f'c = 4,000 psi`, `fy = 60,000 psi`, `As = 3.00 in^2`
(three #9 at 1.00 in^2 each), `b = 12 in`, `d = 21.5 in`: `a = (3.00 x 60,000) / (0.85 x 4,000 x 12) = 180,000 / 40,800 =
4.41 in`; `Mn = 3.00 x 60,000 x (21.5 - 2.206) / 1,000 = 180 x 19.29 = 3,473 kip-in = 289.4 kip-ft`;
`phi Mn = 0.90 x 289.4 = ` **260 kip-ft** design moment. The section is tension-controlled (`c = a/0.85 = 5.19 in`,
`epsilon_t = 0.003 x (21.5 - 5.19)/5.19 = 0.0094 >= 0.005`), so `phi = 0.90` holds and the value matches the standard
reinforced-concrete textbook result to the printed precision. A required moment of 200 kip-ft gives `util = 200/260 =
0.77`, so the beam passes with about 23% reserve. **Cross-check (a lighter 10x18 beam, two #9 bars).** `f'c = 4,000`,
`fy = 60,000`, `As = 2.00 in^2`, `b = 10`, `d = 16`: `a = 120,000 / 34,000 = 3.53 in`; `Mn = 2.00 x 60,000 x (16 - 1.76)/
1,000 = 120 x 14.24 = 1,708 kip-in = 142.4 kip-ft`; `phi Mn = ` **128 kip-ft** -- a section two-thirds the depth with
a third less steel carries barely half the moment, which is why depth `d`, entering the lever arm nearly linearly, is the
dominant lever a designer reaches for before adding bars.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["construction","carpentry"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the flexural relation, `editionNote` naming ACI 318-19 §22.2.2.4.1 / §22.2 / §21.2.2 with the
singly-reinforced, tension-controlled-only, confirm-`epsilon_t`, take-`As`-and-`d`-from-the-schedule, and design-aid
caveats); `test/fixtures/worked-examples.json` (the 12x24 three-#9 example + the 10x18 two-#9 cross-check);
`test/fixtures/compute-map.js` (`rc-beam-flexure` -> `computeRcBeamFlexure` in `../../calc-concrete.js`);
`scripts/related-tiles.mjs` (-> `rc-beam-shear` / `rc-development-length` / `steel-beam-flexure`); `data/search/aliases.json`
("concrete beam capacity", "RC beam moment", "ACI 318 flexure", "phi Mn", "As fy d minus a over 2", "stress block depth",
"does the concrete beam hold", "singly reinforced beam"); the id appended to a new concrete renderers declare in `app.js`;
the `// dims:` annotation (`fc`/`fy` pressure, `as_in2` length^2, `b`/`d`/`a` length, moments force x length); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, `fc <= 0`,
`fy <= 0`, `as_in2 <= 0`, `b <= 0`, `d <= 0`). Add the `calc-concrete.js` size to the `check:module-sizes` allowlist
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the five non-positive error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the a / Mn / phi-Mn / utilization stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (12x24 three-#9 -> 4.41 in block, 260 kip-ft design moment).

## 5. Roadmap position

Opens the ACI 318-19 reinforced-concrete member batch (v257..v259). The moment check sits beside the shear check
`rc-beam-shear` (v258) -- together the two limit states that size a beam -- and the bar-development check
`rc-development-length` (v259), and parallels the steel-member batch (v254..v256) one material over. A doubly-reinforced /
compression-steel extension, a T-beam flexural form (effective flange width per §6.3.2), and a minimum-and-maximum steel
check (§9.6.1) are the deliberate next follow-ons once the base member checks land.
