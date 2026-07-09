# roughlogic.com Specification v559 -- PV Equipment Grounding Conductor (calc-solar.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-solar.js`**
> (Group A, the solar bench); no new module, group, or dependency. Inherits spec.md through spec-v558.md.
>
> **The gap, and the evidence for it.** `egc-sizing` sizes an ordinary equipment grounding conductor from the
> overcurrent device via Table 250.122, but PV source and output circuits follow the special rules of NEC 690.45, and
> the bench has no PV-specific EGC tile. Two catches trip installers into over-building. First, a PV source circuit with
> two or fewer source circuits often has **no overcurrent device** at all (the array cannot deliver enough fault
> current to need one), so the EGC is sized from the PV **short-circuit current** rather than an OCPD rating -- and it
> never has to be smaller than 14 AWG. Second, 690.45 **waives** the Section 250.122(B) rule that would otherwise force
> the EGC to be upsized in proportion when the circuit conductors are enlarged for voltage drop. Installers who apply
> the general rules upsize both the conductor and the EGC needlessly. The tile takes the OCPD rating (or the PV
> short-circuit current when there is none) and a voltage-drop-upsize flag, and returns the required EGC, honoring the
> 14 AWG minimum and the 690.45 exception.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The overcurrent rating and
the PV short-circuit current are currents (`I`, in amps); the EGC size is a wire gauge (`dimensionless`, an AWG/kcmil
selection). The v18/v21 contract: any non-finite input, or a case with neither a positive OCPD rating nor a positive PV
short-circuit current returns `{ error }`. Citation discipline (v19/v22): `NEC` over 690.45; `editionNote` names **NEC
2023 690.45 (equipment grounding conductors, PV systems) with Table 250.122**, prints the EGC selected from Table
250.122 by the governing overcurrent rating (or, where there is no OCPD, by the PV short-circuit current), the 14 AWG
minimum, and the note that the 250.122(B) proportional upsize does not apply, and states that **a PV source circuit with
two or fewer source circuits often has no overcurrent device so the EGC is sized from the PV short-circuit current not
an OCPD rating, the EGC is never smaller than 14 AWG, 690.45 waives the 250.122(B) rule so enlarging the circuit
conductors for voltage drop does not require enlarging the EGC, and the NEC and the AHJ govern** -- a design aid, not
the AHJ.

## 2. The tile

### 2.1 `solar-egc-690-45` -- The PV Grounding Conductor: No-OCPD Sizing and the Voltage-Drop Exception

```
inputs:
  ocpd_rating_a     A     overcurrent device rating protecting the circuit (0 = no OCPD)
  pv_isc_a          A     PV short-circuit current (used when there is no OCPD)
  vd_upsized        bool  are the circuit conductors upsized for voltage drop?

basis_current = ocpd_rating_a > 0 ? ocpd_rating_a : pv_isc_a           [A]
egc           = Table 250.122 size for basis_current, not smaller than 14 AWG
egc_upsize    = false   // 690.45 waives 250.122(B) even when vd_upsized is true
```

**Pinned worked example (a PV output circuit with a 20 A overcurrent device).** Table 250.122 gives a **12 AWG** copper
EGC for a 20 A device, above the 14 AWG floor, so the EGC is **12 AWG** -- the same as an ordinary circuit at that OCPD.
**Cross-check (no OCPD, and conductors upsized for voltage drop).** A two-source-circuit array with no overcurrent
device and a `10 A` short-circuit current is sized from that current, giving the **14 AWG** minimum; and even though the
circuit conductors were enlarged (say from 10 AWG to 8 AWG) to hold voltage drop over a long roof run, 690.45 waives the
proportional-upsize rule, so the EGC **stays at 14 AWG** rather than being dragged up with the conductors -- the
over-build the general rules would have caused. The tile returns the required EGC and confirms no voltage-drop upsize is
required.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "solar"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`NEC`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the OCPD example + the no-OCPD / VD-upsize
cross-check); `test/fixtures/compute-map.js` (`solar-egc-690-45` -> `computeSolarEgc69045` in `../../calc-solar.js`);
`scripts/related-tiles.mjs` (-> `egc-sizing` / `pv-circuit-ampacity` / `pv-string-fusing`); `data/search/aliases.json`
("pv egc", "solar grounding conductor", "690.45", "equipment grounding pv", "no ocpd egc", "voltage drop egc
exception", "14 awg minimum egc", "pv source circuit ground"); the id appended to the solar renderers declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both
examples, the OCPD-vs-Isc basis, the 14 AWG floor, the no-upsize-for-VD behavior, and the error seams (non-finite,
neither OCPD nor Isc positive). Hand-writes its renderer (mirroring the calc-solar.js `pv-string-fusing` pattern). Lazy-
loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the basis / EGC / upsize stack wraps on a phone); render-no-nan + a11y on the new tile, output
read to the value (the 20 A example -> 12 AWG).

## 5. Roadmap position

Adds the PV-specific EGC rules beside the general `egc-sizing`, and completes the PV conductor set with
`pv-circuit-ampacity` and `pv-string-fusing`. An equipment-bonding-jumper for PV and a grounding-electrode-conductor for
an array subpanel are deliberate future follow-ons. Further Group A growth stays evidence-driven.
