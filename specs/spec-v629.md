# roughlogic.com Specification v629 -- Pump Suction Specific Speed (Nss) (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-11). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C,
> HVAC), no new module, group, or dependency. Inherits spec.md through spec-v628.md.
>
> **The gap, and the evidence for it.** Spec-v307 (`pump-specific-speed`) computes the impeller-classifying specific
> speed `Ns` and both its note and citation say the same thing: it "does not compute the suction specific speed Nss
> (a separate NPSH-margin index)." `Nss` is the same definitional form with the required NPSH substituted for head,
> and it answers a different question: not what impeller the duty needs, but whether the pump is being run so hard
> on its suction that it will cavitate and wear. The Hydraulic Institute's long-standing design guideline caps `Nss`
> near **8,500**; pumps pushed above it (and especially above ~11,000) show documented suction-recirculation damage
> and shorter life. The number that catches designers out: a 1,750 rpm, 2,000 gpm pump with a comfortable 25 ft of
> required NPSH sits at a safe `Nss = 7,000`, but the same pump on a tighter 16 ft NPSHr jumps to **9,783** -- above
> the limit and into recirculation territory, with nothing changed but the suction margin.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`pump-specific-speed` sibling: the speed is `T^-1`, the flow is `L^3 T^-1`, the required NPSH is `L`, and the index
is `dimensionless` (dimensional-in-practice US form). The v18/v21 contract: any non-finite input, or a non-positive
speed, flow, or required NPSH returns `{ error }`. Citation discipline (v19/v22): the Hydraulic Institute suction
specific speed convention by name; the note states that **Nss = N sqrt(Q) / NPSHr^(3/4) with Q the best-efficiency-
point flow (half the total for a double-suction impeller) and NPSHr the required NPSH in feet, the customary ~8,500
design guideline and the ~11,000 reliability threshold are advisory Hydraulic Institute practice, and the pump
manufacturer's curves and a real NPSH-margin check govern** -- an engineering aid, not a pump selection.

## 2. The tile

### 2.1 `pump-suction-specific-speed` -- Is the Pump Running Too Hard on Its Suction? (Nss)

```
inputs:
  n_rpm       rpm    pump speed (> 0)
  q_gpm       gpm    flow at the best-efficiency point (> 0; use half the total for a double-suction impeller)
  npshr_ft    ft     required NPSH at that flow (> 0)

Nss = n_rpm x sqrt(q_gpm) / npshr_ft^(3/4)     [-]
band:  Nss < 8,500          within the traditional Hydraulic Institute design limit
       8,500 <= Nss < 11,000  above 8,500 - manage against suction recirculation
       Nss >= 11,000         above ~11,000 - documented reliability concern
```

**Pinned worked example (a pump within the limit).** N = 1,750 rpm, Q = 2,000 gpm at BEP, NPSHr = 25 ft:
`Nss = 1,750 x sqrt(2,000) / 25^(3/4) = 1,750 x 44.72 / 11.18 = ` **7,000** -- within the traditional 8,500 design
guideline. **Cross-check (the same pump on a tighter suction).** Drop NPSHr to 16 ft (so `16^(3/4) = 8`):
`Nss = 1,750 x 44.72 / 8 = ` **9,783** -- above 8,500 and into the suction-recirculation range, the reliability
penalty of specifying a pump with too little required-NPSH headroom for its speed and flow.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac", "plumbing"]`, beside `pump-specific-speed`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (Hydraulic Institute Nss, the note per §1); `test/fixtures/worked-examples.json`
(both examples); `test/fixtures/compute-map.js` (`pump-suction-specific-speed` -> `computePumpSuctionSpecificSpeed`
in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `pump-specific-speed` / `npsh-available` / `pump-affinity`
where present); `data/search/aliases.json` ("suction specific speed", "nss", "npsh margin index", "suction
recirculation", plus question rows); `HVAC_RENDERERS["pump-suction-specific-speed"]` via the module's `_rEnv`
factory (mirroring `pump-specific-speed`) and the id added to the calc-hvac declare list in `app.js`; the `// dims:`
annotation directly above the compute; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
both examples, the shared definitional form with the Ns tile, the band thresholds, and the error seams (non-finite,
non-positive speed / flow / NPSHr). Group C has no exact audit-count assertion and the mechanical-governance test is
an explicit list, so no count bump. The calc-hvac.js gzip cap is expected to hold (verify at build). Lazy-loaded,
absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 30 gates); `npm test` (+2 fixtures, the new fuzzer block); `npm run build`
(one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output
read to the value (the pinned example -> Nss 7,000, within the limit).

## 5. Roadmap position

Completes the pump-index pair spec-v307 opened with `pump-specific-speed`: Ns classifies the impeller, Nss guards
the suction. Both are pure definitional forms off the pump's own rated numbers. Further Group C growth stays
evidence-driven.
