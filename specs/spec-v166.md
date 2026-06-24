# roughlogic.com Specification v166 -- Equipment Grounding Conductor Proportional Upsize (NEC 250.122(B)) (calc-electrical.js, Group A, 1 New Tile)

> **Status: CUT 2026-06-24 (duplicate of an existing tile). Batch spec-v164..v178 (electrician trade).** During the
> v164..v178 landing pass the catalog was found to ALREADY contain `egc-upsize-proportional` ("EGC Proportional
> Upsize for Increased Conductors (NEC 250.122(B))", `computeEgcUpsizeProportional` in calc-electrical.js), which
> implements exactly this 250.122(B) circular-mil-proportion rule (ratio = max(1, installed phase / base phase);
> upsized EGC = base EGC x ratio). The proposed `egc-upsize` is the same calculation under a different id, so it is
> cut rather than shipped as a duplicate. The "gap" claimed below was already closed by a prior batch. Original
> proposal preserved below for the audit trail.
>
> **Status (superseded): PROPOSED 2026-06-23. Batch spec-v164..v178 (electrician trade).** In-scope catalog
> expansion under the spec-v106 trades-only charter: one tile applying the NEC 250.122(B) requirement
> that an equipment grounding conductor be increased in size, proportionally by circular-mil area,
> whenever the ungrounded conductors are upsized above their minimum. Adds one tile to
> **`calc-electrical.js`** (Group A); no new module, group, or dependency. Inherits spec.md through
> spec-v163.md.
>
> **The gap, and the evidence for it.** The catalog sizes the base EGC from the OCPD (`egc-sizing`,
> Table 250.122) and sizes ungrounded conductors up for voltage drop (`min-conductor-for-vd`), but the
> rule that *connects* them is missing: when conductors are enlarged for voltage drop or any other
> reason, 250.122(B) makes the EGC grow in the same circular-mil proportion. It is one of the most
> commonly missed line items on a plan review, and the catalog computes both halves but not the bridge.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
base EGC area, the required (minimum) ungrounded area, the installed (upsized) ungrounded area, and
the resulting EGC area are all circular mils (`area`, carried as cmil); the proportion factor is
`dimensionless`. The v18/v21 contract: any non-finite input, or any non-positive area, returns
`{ error }`; the only division is by the guarded-positive required ungrounded area. Citation
discipline (v19/v22): `GOVERNANCE.electrical`, edition `NEC 2023 250.122(B) (increase in size of
equipment grounding conductors)`, `editionNote` `NEC_DISCLOSURE`, with the note that the result is a
minimum circular-mil area to be rounded **up** to a standard AWG/kcmil from Chapter 9 Table 8, and
that parallel runs and the 250.122(A) base selection are handled by their own rules.

## 2. The tile

### 2.1 `egc-upsize` -- Proportional EGC Increase When Ungrounded Conductors Are Upsized

```
inputs:
  base_egc_cmil          area   EGC area from Table 250.122 for the OCPD (e.g. #10 = 10380)
  required_ungnd_cmil    area   minimum ungrounded conductor area for the load/OCPD
  installed_ungnd_cmil   area   actual (upsized) ungrounded conductor area installed

factor        = installed_ungnd_cmil / required_ungnd_cmil   # >= 1 when upsized
required_egc_cmil = base_egc_cmil x factor
verdict: select the next standard conductor with area >= required_egc_cmil
```

**Pinned worked example.** A 60 A circuit: base EGC is #10 Cu (10,380 cmil, Table 250.122) and the
minimum ungrounded conductor is #6 Cu (26,240 cmil). For voltage drop the run is upsized to #3 Cu
(52,620 cmil): `factor = 52,620 / 26,240 = 2.005`; `required_egc = 10,380 x 2.005 = 20,815 cmil`. The
next standard size at or above 20,815 cmil is **#6 Cu (26,240 cmil)** -- the EGC must grow from #10 to
#6. **Cross-check (no upsize).** If the installed conductor equals the required (#6 = #6),
`factor = 1.00` and the EGC stays at the base #10 (10,380 cmil). Round the computed area up to a
standard size from Table 8; the AHJ governs.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEC 2023 250.122(B), the circular-mil proportion and
the round-up-to-standard note, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`egc-upsize` -> `computeEgcUpsize` in `../../calc-electrical.js`); `scripts/related-tiles.mjs`
(-> `egc-sizing` / `min-conductor-for-vd` / `voltage-drop`); `data/search/aliases.json` ("egc
upsize", "ground upsize", "250.122(B)", "grounding conductor increase", "proportional ground",
"upsized ground"); the id appended to the existing `ELECTRICAL_RENDERERS` declare in `app.js`; the
`// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning
the upsize example, the no-upsize cross-check, and error seams (non-finite, any area <= 0). Raise the
`calc-electrical.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js` cap if
needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the no-upsize path); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the factor,
required cmil, and selected size wrap on a phone); render-no-nan + a11y sweep, output read to the
value (60 A circuit, #6->#3 -> 20,815 cmil EGC -> #6; factor 1.0 -> #10 unchanged).

## 5. Roadmap position

Bridges the EGC family (`egc-sizing`) and the voltage-drop upsizing family
(`min-conductor-for-vd`, `voltage-drop`). Further Group A growth stays evidence-driven.
