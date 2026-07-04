# roughlogic.com Specification v451 -- Hydronic Diaphragm Expansion Tank Sizing (calc-plumbing.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-03). Second tile of the plumbing-systems trio (v450 air gap -> v451 hydronic expansion tank ->
> v452 hydronic fill pressure). `wh-expansion-tank` sizes a potable domestic-hot-water tank off the incoming supply
> pressure; a closed hydronic *heating* loop uses a different formula -- the diaphragm-tank acceptance volume from the fill
> and relief pressures -- that no tile computes.**
> In-scope catalog expansion under the spec-v106 trades-only charter. A closed heating loop needs an expansion tank to absorb
> the water's thermal growth without over-pressurizing the relief valve. The ASME/Bell-and-Gossett diaphragm-tank sizing is
> `Vt = Vs * Ef / (1 - (Pi + 14.7)/(Pf + 14.7))`, where `Vs` is the system volume, `Ef` the net expansion factor over the
> operating temperature rise, `Pi` the fill pressure and `Pf` the relief (maximum) pressure, both gauge. `wh-expansion-tank`
> is a potable-water tank on an incoming-pressure basis, not the fill-to-relief formula. This adds the hydronic tile to the
> existing **`calc-plumbing.js`** module (Group B); no new group, trade, or dependency. Inherits spec.md through
> spec-v450.md.
>
> **The gap, and the evidence for it.** A `200 gallon` heating loop with a net expansion factor of `0.0355` (about a
> `40 deg F` to `200 deg F` swing), a `12 psig` fill, and a `30 psig` relief needs a tank of
> `Vt = 200 * 0.0355 / (1 - (12+14.7)/(30+14.7)) = 7.1 / 0.403 = 17.6 gallons` of acceptance volume. Raise the fill to
> `20 psig` against a `50 psig` relief and the tank shrinks to `15.3 gallons` -- a wider pressure window needs less tank. No
> tile does this; the potable tank formula gives the wrong answer for a heating loop.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The system and tank volumes
are volumes (gal); the expansion factor is dimensionless; the fill and relief pressures are pressures (psig). The v18/v21
contract: any non-finite input, or a non-positive system volume or expansion factor, or a fill pressure at or above the
relief pressure, returns `{ error }`; the tile converts gauge to absolute internally (`+14.7`) and reports the required tank
(acceptance) volume. Citation discipline (v19/v22): `GOVERNANCE.general` over the hydronic expansion tank by name;
`editionNote` names **the ASME / Bell-and-Gossett diaphragm-tank relation `Vt = Vs * Ef / (1 - Pa/Pf_abs)` with the fill and
relief pressures taken absolute (gauge `+ 14.7`), the net expansion factor `Ef` (about `0.023` to `0.04` for a `40 to 200
deg F` water swing, higher with glycol), and the fill pressure set to lift water to the top of the system plus a margin**,
and states that **this returns the diaphragm-tank acceptance volume for a closed hydronic heating loop, that `Ef` and the
system volume come from the temperature swing and a system-volume takeoff, and that it is a design aid, not a substitute for
the manufacturer's tank selection**.

## 2. The tile

### 2.1 `hydronic-expansion-tank` -- Hydronic Diaphragm Expansion Tank Sizing

```
inputs:
  system_vol_gal   gal    total loop water volume Vs
  expansion_factor -      net fluid expansion factor Ef
  fill_psig        psig   fill (pre-charge) pressure Pi
  relief_psig      psig   relief / maximum pressure Pf

vt_gal = system_vol_gal * expansion_factor / (1 - (fill_psig + 14.7)/(relief_psig + 14.7))
```

**Pinned worked example (200 gal, Ef 0.0355, fill 12, relief 30 psig).**
`Vt = 200 * 0.0355 / (1 - 26.7/44.7) = 7.1 / 0.403 = 17.6 gal`. **Cross-check (wider pressure window).** At a `20 psig` fill
and `50 psig` relief, `Vt = 15.3 gal` -- more room between fill and relief means a smaller tank. A fill pressure at or above
the relief, or a non-positive volume, takes the error path; the non-finite seam is covered.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, beside `wh-expansion-tank` / `expansion-tank`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ASME diaphragm-tank formula, `editionNote` naming the
`Vt = Vs*Ef/(1-Pa/Pf)` relation, the absolute-pressure conversion, and the `Ef` range); `test/fixtures/worked-examples.json`
(the 12/30 example + the 20/50 cross-check); `test/fixtures/compute-map.js` (`hydronic-expansion-tank` ->
`computeHydronicExpansionTank` in `../../calc-plumbing.js`); `scripts/related-tiles.mjs` (-> `wh-expansion-tank` /
`hydronic-fill-pressure` / `hydronic-gpm-deltat` / `pipe-expansion`); `data/search/aliases.json` ("hydronic expansion tank",
"heating expansion tank", "diaphragm tank sizing", "closed loop expansion tank", "boiler expansion tank", "acceptance
volume", "expansion tank hydronic", "bell gossett tank", "hydronic tank sizing"); the id appended to the existing plumbing
renderers block in `app.js`; the `// dims:` annotation (volumes volume, Ef dimensionless, pressures pressure); regenerated
v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the fill-vs-relief guard, and the
non-positive / non-finite error seams. No new module; re-pin `calc-plumbing.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the fill-vs-relief guard, the error paths); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the tank-volume output wraps on a phone);
render-no-nan + a11y sweep, output read to the value (200 gal, 12/30 psig -> 17.6 gal).

## 5. Roadmap position

The middle of the plumbing-systems trio: `cross-connection-air-gap` (v450) and `hydronic-fill-pressure` (v452) bracket it,
the latter setting the fill pressure this tank sizing consumes. A temperature-swing-to-expansion-factor lookup and a glycol
expansion-factor adjustment are the deliberate next follow-ons.
