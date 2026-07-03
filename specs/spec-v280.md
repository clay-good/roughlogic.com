# roughlogic.com Specification v280 -- Continuous-Load Overcurrent Device and Conductor at 125% (NEC 210.20 / 215.3) (calc-feeder.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-03, package 0.99.0; proposed 2026-07-02). Batch spec-v278..v280 (the NEC conductor-and-overcurrent-sizing trio --
> motor overload (v278), the dwelling service conductor at 83% (v279), the continuous-load device at 125% (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the 125% continuous-load rule is the single most
> reused NEC sizing step, baked into `commercial-lighting-load` and others, but the catalog has no standalone tile that
> takes a mixed continuous-and-noncontinuous load and returns the branch or feeder breaker and the minimum conductor. Adds
> one tile to the existing **`calc-feeder.js`** module (Group A); no new group, trade, or dependency. Inherits spec.md
> through spec-v279.md.
>
> **The gap, and the evidence for it.** NEC 210.20(A) (branch circuits) and 215.3 (feeders) require the overcurrent device
> to be rated not less than 125% of the continuous load plus 100% of the noncontinuous load, and 210.19/215.2 require the
> conductor (before ampacity adjustment) to have an ampacity of at least that same sum. The minimum is
> `A_min = 1.25 * L_cont + L_noncont`, and the device is the smallest NEC 240.6(A) standard size at or above `A_min`. For a
> 40 A continuous plus 20 A noncontinuous load, `A_min = 1.25 * 40 + 20 = 70 A`, a standard size, so a 70 A breaker on a
> conductor good for at least 70 A. Where the assembly and device are listed for 100% continuous operation (215.2(A)(1)
> Exception, 210.20(A) Exception), the 125% multiplier drops and `A_min = L_cont + L_noncont = 60 A`. This is the rule an
> electrician applies to nearly every feeder and branch circuit; the catalog references it but never sizes it directly.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The continuous and
noncontinuous loads `L_cont`, `L_noncont` are currents (A); the minimum required rating `A_min` is a current (A); the
selected overcurrent device is a standard NEC 240.6(A) ampere rating (a categorical/quantized current output). The v18/v21
contract: any non-finite input, a negative load, or a total load of zero returns `{ error }`. Citation discipline
(v19/v22): `GOVERNANCE.general` over the 125% continuous-load rule by name; `editionNote` names **the NEC 2023 210.20(A) /
215.3 overcurrent rule and 210.19(A)/215.2(A) conductor rule -- `A_min = 1.25 * L_cont + L_noncont`, device selected from
the 240.6(A) standard ratings, with the 100%-rated-assembly exception dropping the 1.25 factor**, and states that **this
returns the minimum device rating and the minimum conductor ampacity before adjustment -- it assumes the standard
75 degC-terminated case, does not apply the ambient or more-than-three-conductor adjustment (`ambient-ampacity-adjust`), the
110.14(C) termination limit, the 240.4(B) next-standard-size conductor-protection allowance, or the equipment-specific
percentages (motor 430, HVAC 440, welder 630); and this is a design aid, not a substitute for the installing electrician
and the AHJ** -- the authority having jurisdiction governs.

## 2. The tile

### 2.1 `continuous-load-ocpd` -- Continuous-Load OCPD and Conductor at 125% (NEC 210.20 / 215.3)

```
inputs:
  l_cont_A     A     continuous load (operates >= 3 hours)
  l_noncont_A  A     noncontinuous load
  rated_100    -     device+assembly listed for 100% continuous? (default no)

mult   = rated_100 ? 1.00 : 1.25                     ; continuous multiplier
A_min  = mult * l_cont_A + l_noncont_A               ; minimum OCPD and conductor ampacity, A
ocpd_A = smallest 240.6(A) standard rating >= A_min  ; selected overcurrent device, A
```

240.6(A) standard ratings (A): 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300,
350, 400, 450, 500, 600, 700, 800 (and up).

**Pinned worked example (40 A continuous + 20 A noncontinuous, standard 80%-rated).** `l_cont = 40`, `l_noncont = 20`,
`rated_100 = no`: `A_min = 1.25 * 40 + 20 = 70 A`, itself a standard rating, so a 70 A overcurrent device on a conductor
rated at least 70 A (a #4 copper at 75 degC, 85 A, clears it). **Cross-check (a 100%-rated assembly, and a non-standard
minimum).** With the same 40 A + 20 A but a 100%-rated device: `A_min = 1.00 * 40 + 20 = 60 A` -> a 60 A device, one size
down. And for 44 A continuous + 10 A noncontinuous (80%-rated): `A_min = 1.25 * 44 + 10 = 65 A`, not a standard size, so the
device rounds up to the next 240.6(A) size, 70 A. The non-finite, negative-load, and zero-total error paths bracket the
result.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, matching the feeder/branch tiles); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (`GOVERNANCE.general`, the NEC 210.20/215.3 and 210.19/215.2 rules, `editionNote` naming
`A_min = 1.25 * L_cont + L_noncont`, the 240.6(A) selection, the 100%-rated exception, and the no-adjustment,
not-equipment-specific caveats); `test/fixtures/worked-examples.json` (the 40+20 standard example + the 100%-rated and
round-up cross-checks); `test/fixtures/compute-map.js` (`continuous-load-ocpd` -> `computeContinuousLoadOcpd` in
`../../calc-feeder.js`); `scripts/related-tiles.mjs` (-> `service-conductor-sizing` / `commercial-lighting-load` /
`ambient-ampacity-adjust` / `wire-ampacity`); `data/search/aliases.json` ("continuous load", "125 percent rule", "NEC
210.20", "breaker sizing continuous load", "feeder overcurrent sizing", "80 percent breaker", "100 percent rated breaker",
"continuous vs noncontinuous", "OCPD sizing"); the id appended to the existing feeder renderers block in `app.js`; the
`// dims:` annotation (`l_cont`/`l_noncont`/`A_min`/`ocpd` current, `rated_100` boolean); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning all three examples, the 100%-rated branch, the 240.6(A) round-up (use
an ordered array of standard ratings, smallest first), and the negative-load / zero-total / non-finite error seams. No new
module; re-pin `calc-feeder.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+3 fixtures, the new fuzzer block, the error paths, the round-up and 100%-rated assertions); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `A_min` and `ocpd` with the
multiplier note wrap on a phone); render-no-nan + a11y sweep, output read to the value (40+20 A -> 70 A min, 70 A device).

## 5. Roadmap position

Closes the NEC conductor-and-overcurrent-sizing batch (v278..v280) in `calc-feeder.js`: the motor overload (v278), the
dwelling service conductor (v279), and the general continuous-load device (this tile) now cover the three sizing steps the
catalog previously only referenced. The 240.4(B) next-standard-size conductor-protection allowance, the 110.14(C)
termination-temperature limit as its own tile, and the equipment-specific percentage tables (welder 630, HVAC 440) are the
deliberate next follow-ons once the trio lands.
