# roughlogic.com Specification v588 -- Steam Orifice / PRV Capacity, Napier (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-pipefit.js`**
> (Group B, the pipefitting bench); no new module, group, or dependency. Inherits spec.md through spec-v587.md.
>
> **The gap, and the evidence for it.** `valve-flow-coefficient` gives a generic liquid Cv, but steam through an orifice
> or a pressure-reducing valve is a compressible, choked flow, and the bench has no tile for it. Napier's formula sizes
> it: `W = 51.43 x A x P1` (with a discharge coefficient) for saturated steam. The catch that trips fitters is the
> choked-flow condition -- when the downstream absolute pressure falls **below 58% of the upstream** absolute pressure,
> the flow chokes and the capacity depends only on the upstream pressure, no matter how low the downstream goes. Two more
> traps: Napier is for **saturated** steam (superheat needs a correction factor), and using a **liquid Cv** (which scales
> with the square root of pressure drop) for choked steam is simply wrong. The tile takes the orifice area, the
> upstream and downstream pressures, and the discharge coefficient, and returns the steam capacity and whether the flow
> is choked -- the right way to size a steam orifice or relief.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The orifice area is an
area (`L^2`, in in^2); the upstream and downstream pressures are pressures (`M L^-1 T^-2`, in psia); the steam capacity
is a mass flow (`M T^-1`, in lb/hr); the discharge coefficient and the `51.43` and `0.58` constants are `dimensionless`.
The v18/v21 contract: any non-finite input, a non-positive orifice area or upstream pressure, a downstream pressure
above the upstream, or a discharge coefficient outside `(0, 1]` returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the Napier relation by name (Napier's formula; ASME/API 520; Grashof); `editionNote` names the
**steam orifice / PRV capacity (Napier)**, prints the choked-flow test `P2 < 0.58 x P1`, the capacity
`W = 51.43 x Cd x A x P1` (saturated, choked), and the note that a subcritical flow needs a correction, and states that
**flow chokes when the downstream absolute pressure is below 58% of the upstream and the capacity then depends only on
the upstream pressure, Napier is for saturated steam (superheat needs a Ksh factor), a liquid Cv (which scales with the
square root of pressure drop) is wrong for choked steam, the discharge coefficient (about 0.6 for a sharp-edged orifice,
near 1 for a nozzle) must be applied, and ASME/API and the valve manufacturer govern** -- a sizing aid, not a relief-
valve certification.

## 2. The tile

### 2.1 `steam-prv-napier` -- Choked Steam Capacity (Not a Liquid Cv)

```
inputs:
  orifice_area_in2   in2    orifice / seat area A
  upstream_p_psia    psia   upstream absolute pressure P1
  downstream_p_psia  psia   downstream absolute pressure P2
  discharge_coeff    -      discharge coefficient Cd (~0.6 sharp orifice, ~1 nozzle)

choked      = downstream_p_psia < 0.58 x upstream_p_psia
capacity    = 51.43 x discharge_coeff x orifice_area_in2 x upstream_p_psia     [lb/hr]  (saturated, choked)
```

**Pinned worked example (a 0.5 in^2 orifice, 100 psia upstream, 30 psia downstream, Cd = 0.9).** The choke threshold is
`0.58 x 100 = 58 psia`, and the 30 psia downstream is below it, so the flow is **choked** -- capacity depends only on
the upstream pressure. The steam capacity is `51.43 x 0.9 x 0.5 x 100 = ` **2,314 lb/hr**. Dropping the downstream
further (to 15 psia, or even a vacuum) would not increase it, the defining property of choked flow. **Cross-check (more
upstream pressure raises the choked capacity linearly).** Raise the upstream to `150 psia` (choke threshold now 87
psia, still choked at 30): `W = 51.43 x 0.9 x 0.5 x 150 = ` **3,472 lb/hr** -- 50% more capacity for 50% more upstream
pressure, the linear-in-P1 behavior a liquid Cv (square-root in pressure drop) would get badly wrong. The tile returns
the choked flag and the steam capacity.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["pipefitting", "plumbing"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 100 psia
example + the 150 psia cross-check); `test/fixtures/compute-map.js` (`steam-prv-napier` -> `computeSteamPrvNapier` in
`../../calc-pipefit.js`); `scripts/related-tiles.mjs` (-> `valve-flow-coefficient` / `flash-steam-pct` /
`steam-warmup-condensate`); `data/search/aliases.json` ("napier formula", "steam orifice capacity", "steam prv", "steam
relief sizing", "choked steam flow", "51.43 napier", "steam valve capacity", "critical steam flow"); the id appended to
the pipefit renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the choke threshold, the linear-in-P1 capacity, the Cd scaling, and
the error seams (non-finite, non-positive area / P1, P2 > P1, Cd out of range). Hand-writes its renderer (mirroring the
calc-pipefit.js `valve-flow-coefficient` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the choked / capacity stack wraps on a phone); render-no-nan + a11y on the new tile, output read
to the value (the 100 psia example -> choked, 2,314 lb/hr).

## 5. Roadmap position

Adds compressible steam sizing beside the liquid `valve-flow-coefficient` and the steam tiles `flash-steam-pct` and
`steam-warmup-condensate` (proposed in this campaign's steam cluster). A superheat correction factor (Ksh) and a
subcritical-flow branch (for P2 above the 58% threshold) are deliberate future follow-ons. Further Group B growth stays
evidence-driven.
