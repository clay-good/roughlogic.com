# roughlogic.com Specification v184 -- Maximum Capacitor kVAR at Motor Terminals (Self-Excitation Limit) (calc-powerquality.js, Group A, 1 New Tile)

> **Status: LANDED 2026-06-24 (package 0.80.0; part of catalog 639 -> 648). Batch spec-v179..v187 (electrician trade, second pass).** In-scope
> catalog expansion under the spec-v106 trades-only charter: one tile computing the maximum
> power-factor-correction capacitor kVAR that may be connected directly at an induction motor's
> terminals without risking self-excitation overvoltage on shutdown (NEMA MG-1 / IEEE 18 practice).
> Adds one tile to **`calc-powerquality.js`** (Group A); no new module, group, or dependency. Inherits
> spec.md through spec-v178.md.
>
> **The gap, and the evidence for it.** The catalog sizes a correction capacitor for a target power
> factor (`pf-correction`), but says nothing about the *ceiling* on capacitor kVAR when it is switched
> with the motor: too much capacitance and the spinning motor, disconnected from the line, self-excites
> and produces a damaging overvoltage. The limit is the motor's no-load magnetizing kVAR, and no tile
> computes it -- so a field tech sizing terminal capacitors has only `pf-correction`, which can
> recommend an unsafe value.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The
line-to-line voltage is `voltage`, the no-load (magnetizing) current is `I`, the maximum kVAR is power
(kVAR, carried dimensionless in kVAR). The square-root-of-three factor carries the three-phase bridge.
The v18/v21 contract: any non-finite input, a non-positive voltage, or a negative no-load current
returns `{ error }`; there are no user-denominator divisions. Citation discipline (v19/v22):
`GOVERNANCE.electrical`, edition `NEMA MG-1 / IEEE Std 18 (shunt power capacitors at motor terminals;
self-excitation)`, `editionNote` `NEC_DISCLOSURE`, with the note that the maximum terminal kVAR is
held at or below the motor's no-load magnetizing kVAR (a ~0.9 safety factor is applied), that the
manufacturer's published maximum-kVAR table by HP/RPM is authoritative, and that capacitors switched
with the motor must never raise the no-load PF above unity -- the manufacturer governs.

## 2. The tile

### 2.1 `motor-capacitor-max` -- Max Terminal Capacitor kVAR Before Self-Excitation

```
inputs:
  v_ll              voltage   motor line-to-line voltage
  i_noload_a        I         measured no-load (magnetizing) line current
  safety_factor     dimensionless   margin below the magnetizing kVAR (default 0.90)

magnetizing_kvar   = sqrt(3) x v_ll x i_noload_a / 1000
max_capacitor_kvar = safety_factor x magnetizing_kvar
note: a capacitor switched with the motor must not exceed this value (self-excitation overvoltage)
```

**Pinned worked example.** A 480 V three-phase motor drawing 8 A at no load:
`magnetizing_kvar = sqrt(3) x 480 x 8 / 1000 = 1.732 x 480 x 8 / 1000 = 6.65 kVAR`;
`max_capacitor = 0.90 x 6.65 = 5.99 kVAR` -> a terminal capacitor should be no larger than about
**6 kVAR**. **Cross-check (smaller motor).** A 480 V motor with a 3 A no-load current:
`magnetizing = 1.732 x 480 x 3 / 1000 = 2.49 kVAR`; `max_capacitor = 0.90 x 2.49 = 2.24 kVAR`. The
manufacturer's maximum-kVAR table by HP and speed governs the final selection; pair with `pf-correction`
for the target-PF size and keep the smaller value.

## 3. Wiring

A `tools-data.js` row (group `A`, trade `["electrical"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.electrical`, NEMA MG-1 / IEEE 18, the magnetizing-kVAR limit and the
manufacturer-table note listed, `editionNote` `NEC_DISCLOSURE`);
`test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`motor-capacitor-max` -> `computeMotorCapacitorMax` in `../../calc-powerquality.js`);
`scripts/related-tiles.mjs` (-> `pf-correction` / `power-triangle` / `motor-fla`);
`data/search/aliases.json` ("self excitation", "motor capacitor", "max kvar motor", "terminal
capacitor", "power factor capacitor motor", "magnetizing kvar"); the id appended to the existing
`POWERQUALITY_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus +
tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams (non-finite, v_ll <=
0, i_noload < 0). Raise the `calc-powerquality.js` size cap by ~20 percent if needed (dated comment);
bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the magnetizing kVAR and max
capacitor lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (480 V / 8 A ->
6.65 / 5.99 kVAR; 3 A -> 2.49 / 2.24 kVAR).

## 5. Roadmap position

Adds the self-excitation ceiling to the power-factor family (`pf-correction`, `power-triangle`).
Further Group A growth stays evidence-driven.
