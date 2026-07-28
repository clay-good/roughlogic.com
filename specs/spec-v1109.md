# roughlogic.com Specification v1109 -- Multiwire Branch Circuit Voltage Drop (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to
> **`calc-electrical.js`** (Group A), no new module, group, or dependency. Inherits spec.md through
> spec-v1108.md.
>
> **The gap, and the evidence for it.** No "multiwire", "MWBC", or "shared neutral" string exists in
> tools-data.js, any calc module, or the alias index. `voltage-drop` takes ONE current and has no neutral.
> `multi-load-vd` is loads along a single circuit. `neutral-current-3ph` and `neutral-demand-220-61` are
> three-phase wye and load-calc respectively; `neutral-imbalance` returns a neutral current but no drop.
> Discovery batches 6 and 7 both flagged it, batch 7 as CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-positive
length or voltage, negative or all-zero currents, a non-finite temperature, or an unresolvable
size/material return `{ error }`. `GOVERNANCE.electrical`. Renderer: hand-written non-exported --
`calc-electrical.js` has no `_simpleRenderer` factory, and `makeSelect` returns `{wrap, select}` (not
`.input`), both noted here because they cost a fix during the build.

## 2. The tile

### 2.1 `mwbc-voltage-drop` -- Multiwire Branch Circuit (3-Wire) Voltage Drop

```
inputs:  awg, material, one_way_length_ft, load_a_amps, load_b_amps,
         source_volts (120, line to neutral), temperature_C (75)
compute: R = conductorResistancePerKft(size, material, temp) x length / 1000     one conductor, one way
         neutral = |I_A - I_B|
         VD_A = R(2 I_A - I_B);   VD_B = R(2 I_B - I_A)
         balanced_vd = R x I_heavier;  two_wire_vd = 2 R I_heavier
outputs: r_per_kft, r_ohms, neutral_amps, vd_a_volts, vd_b_volts, volts_a, volts_b,
         pct_a, pct_b, worst_pct, over_3pct, two_wire_vd, balanced_vd, b_rises, a_rises, note
```

**The resistance is computed, not recalled.** `conductorResistancePerKft` is the catalog's own model,
already landed and already fuzzed, so this tile ships no wire table.

**Two results that follow from the shared neutral.** The neutral carries the *difference* and its drop
lands on the two legs with *opposite sign*. So (1) a BALANCED MWBC drops `R x I` per leg -- exactly **half**
what the same load would drop on a two-wire circuit, because the neutral carries nothing; and (2) a badly
unbalanced one drives the lighter leg's drop **negative**: that leg sits *above* nominal. The pinned
example, 16 A against 4 A on 100 ft of 12 AWG, gives leg A 5.41 V of drop and leg B a 1.55 V **rise**. The
crossover is exactly `I_A = 2 I_B`, which the fuzzer pins at zero.

**Worked example (pinned)** as above; cross-check fixture is the balanced case: neutral 0 A, each leg
3.090 V, exactly half the 6.180 V two separate two-wire circuits would drop.

## 3. The hazard, stated in the note

If the shared neutral opens while both legs are loaded, the two loads go **in series across 240 V** and the
lighter one sees a large overvoltage -- destroying electronics and starting fires. So the neutral is
pigtailed rather than run in series through a device yoke, and NEC 210.4(B) requires a common disconnect so
both legs de-energize together. A voltage-drop number alone would not tell anyone that, which is why it is
in the note rather than only the citation.

## 4. Scope limits

DC resistance only -- AC reactance (which matters on long runs and larger conductors) and power factor are
ignored. Steady-state: legs balanced on average can be badly unbalanced at any instant. Equal-size hots and
neutral assumed. The NEC as adopted and the AHJ govern.

## 5. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with `voltage-drop`. Fuzzer pins both governing
relations against R directly, the balanced half-drop identity, the full-unbalance equivalence to a two-wire
circuit, the exact `I_A = 2 I_B` rise threshold from both sides, leg-swap symmetry, length linearity, and
that a larger conductor drops less while aluminum drops more. Cap ledger: `calc-electrical.js` was at 96.7%
before this tile.
