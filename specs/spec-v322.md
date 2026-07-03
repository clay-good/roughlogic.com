# roughlogic.com Specification v322 -- Condenser Heat of Rejection (Total Heat of Rejection) (calc-refrigerant.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v320..v322 (the refrigeration-cycle trio -- mass flow (v320),
> COP (v321), the condenser heat of rejection (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: `cooling-tower` computes heat rejection for a tower
> from its water flow and range, but the refrigeration side never computes the total heat of rejection the condenser must
> shed -- the evaporator load plus the compressor work, the number that sizes the condenser, the tower, or the air-cooled
> coil. Adds one tile to the existing **`calc-refrigerant.js`** module (Group C); no new group, trade, or dependency.
> Inherits spec.md through spec-v321.md.
>
> **The gap, and the evidence for it.** The condenser rejects everything the evaporator absorbed plus the work the
> compressor added: the total heat of rejection is `THR = Q_evap + W_comp = Q_evap (1 + 1/COP)`. For a 5-ton system
> (`Q_evap = 60,000 Btu/h`) running at a `COP = 2.4`, `THR = 60,000 (1 + 1/2.4) = 85,000 Btu/h` -- about 7.1 tons of heat
> rejection for 5 tons of cooling, the ratio (`~1.25` for AC, higher for low-temp refrigeration) a designer uses to size
> the condenser or the cooling tower. A lower COP means more compressor work and a bigger condenser for the same cooling.
> `cooling-tower` sizes the tower's water side; this tile sizes the load the tower (or air-cooled condenser) must reject.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The evaporator capacity
`Q_evap` and the total heat of rejection `THR` are powers (entered/reported in Btu/h and tons); the coefficient of
performance `COP` and the heat-rejection factor `THR/Q_evap` are dimensionless; the compressor work `W_comp` is a power. The
v18/v21 contract: any non-finite input, a capacity at or below zero, or a COP at or below zero returns `{ error }`.
Citation discipline (v19/v22): `GOVERNANCE.general` over the heat-of-rejection relation by name; `editionNote` names **the
total heat of rejection `THR = Q_evap + W_comp = Q_evap (1 + 1/COP)`, the compressor work `W_comp = Q_evap/COP`, and the
typical heat-rejection factor of about 1.25 for comfort cooling (higher at lower COP / low-temperature refrigeration)**,
and states that **this returns the total heat of rejection at the condenser from the evaporator load and the COP -- it uses
the compressor work implied by the COP (an entered work overrides it), assumes the condenser rejects the full evaporator-
plus-compressor heat (no desuperheater/heat-recovery split), and does not add motor heat rejected outside the refrigerant
(a hermetic compressor adds it, a belt-drive does not); and this is an engineering aid** -- the equipment's rated heat-of-
rejection data govern.

## 2. The tile

### 2.1 `condenser-heat-rejection` -- Condenser Total Heat of Rejection

```
inputs:
  Q_evap    tons or Btu/h   evaporator (cooling) capacity
  COP       -               coefficient of performance (or enter W_comp)

Q_btuh = (unit == tons) ? Q_evap*12000 : Q_evap
W_comp = Q_btuh / COP                            ; compressor work, Btu/h
THR = Q_btuh + W_comp = Q_btuh * (1 + 1/COP)     ; total heat of rejection, Btu/h
factor = THR / Q_btuh = 1 + 1/COP                ; heat-rejection factor
THR_tons = THR / 12000
```

**Pinned worked example (a 5-ton system at COP 2.4).** `Q_evap = 5 tons = 60,000 Btu/h`, `COP = 2.4`:
`W_comp = 60,000/2.4 = 25,000 Btu/h`; `THR = 60,000 + 25,000 = 85,000 Btu/h = 7.08 tons`; heat-rejection factor
`= 1 + 1/2.4 = 1.417`. The condenser sheds 42% more than the evaporator absorbs. **Cross-check (a low-efficiency cycle at
COP 1.5).** `THR = 60,000 (1 + 1/1.5) = 60,000 x 1.667 = 100,000 Btu/h = 8.33 tons` -- the worse the COP, the more
compressor heat piles onto the condenser, so a struggling system overloads its own condenser and drives head pressure
higher still. The non-finite, `Q_evap <= 0`, and `COP <= 0` error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","refrigeration"]`, matching the refrigerant tiles); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the heat-of-rejection relation, `editionNote` naming
`THR = Q_evap(1 + 1/COP)`, `W_comp = Q_evap/COP`, the ~1.25 factor, and the no-heat-recovery, hermetic-motor-heat caveats);
`test/fixtures/worked-examples.json` (the COP-2.4 example + the low-COP cross-check); `test/fixtures/compute-map.js`
(`condenser-heat-rejection` -> `computeCondenserHeatRejection` in `../../calc-refrigerant.js`); `scripts/related-tiles.mjs`
(-> `refrigeration-cop` / `refrigerant-mass-flow` / `cooling-tower` / `chiller-tons`); `data/search/aliases.json` ("heat of
rejection", "total heat of rejection", "THR", "condenser load", "heat rejection factor", "condenser sizing", "compressor
heat", "condenser tons", "reject heat refrigeration"); the id appended to the existing refrigerant renderers block in
`app.js`; the `// dims:` annotation (`Q_evap`/`W_comp`/`THR` power, `COP`/factor dimensionless); regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the `1 + 1/COP` factor, the tons conversion, and the
`Q_evap <= 0` / `COP <= 0` / non-finite error seams. No new module; re-pin `calc-refrigerant.js` on the
`check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the `1 + 1/COP` assertion); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `W_comp` / `THR` / factor / tons stack wraps on a
phone); render-no-nan + a11y sweep, output read to the value (5 tons at COP 2.4 -> 85,000 Btu/h, 7.08 tons).

## 5. Roadmap position

Closes the refrigeration-cycle batch (v320..v322) in `calc-refrigerant.js`: mass flow, COP, and heat of rejection now stand
beside the velocity, compression-ratio, and charge tiles, so a tech can walk the P-h diagram end to end. A desuperheater/
heat-recovery split, the hermetic-motor added heat, and a chain into `cooling-tower` sizing the tower from the `THR` are the
deliberate next follow-ons once the trio lands. With this batch the refrigerant cluster spans the full vapor-compression
cycle.
