# roughlogic.com Specification v717 -- Max PF Capacitor Bank to Keep Resonance Off a Harmonic (calc-powerquality.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-14). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-powerquality.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v716.md. Sweep-10 inverse queue.
>
> **The gap, and the evidence for it.** The single-mode `harmonic-resonance` tile runs the resonance-order relation
> forward: from a bank size it returns the parallel-resonance order and flags a nearby harmonic. The design question is
> the inverse -- **the largest PF capacitor bank that keeps the resonant order off the low harmonics**. Since a bigger
> bank LOWERS the order, `h = sqrt(MVA_sc / MVAR_cap)` solved for the bank gives the maximum: `MVAR_cap = MVA_sc /
> h_target^2`. The number this settles: a **200-MVA** bus targeting an order of **4.7** (to stay below the 5th) caps the
> bank at **~9.05 MVAR**.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`harmonic-resonance` sibling: the short-circuit level and the returned bank are `M L^2 T^-3` (MVA / MVAR) and the target
order is dimensionless. The v18/v21 contract (matching the sibling's per-field style): any non-finite input, or a
non-positive short-circuit MVA or target order, returns `{ error }`. Citation discipline (v19/v22): the resonance-order
relation solved for the bank, `GOVERNANCE.general` matching the sibling, citing IEEE 519 / 1531; the note states that
**because a bigger bank lowers the resonant order toward the strong low-order harmonics, a target just below the lowest
harmonic of concern (about 4.7 to stay under the 5th) sets a ceiling on the bank, that splitting into smaller banks or
adding a detuning reactor is the fix for more correction, that the estimate ignores load and resistive damping, and it is
a screening aid, not a harmonic study**.

## 2. The tile

### 2.1 `capacitor-bank-for-resonance-order` -- Max PF Capacitor Bank to Keep Resonance Off a Harmonic

```
inputs:
  short_circuit_mva       M L^2 T^-3    bus short-circuit power (> 0)
  target_resonant_order   dimensionless minimum resonant order to hold (> 0, default 4.7)

max_cap_bank_mvar = short_circuit_mva / target_resonant_order^2
```

**Pinned worked example.** MVA_sc = 200, target order = 4.7: `MVAR_cap = 200 / 4.7^2 = 200 / 22.09 = ` **9.05 MVAR**;
feeding 9.05 MVAR back through `harmonic-resonance` returns a resonant order of 4.7, the target (just below the 5th). A
higher target order (say 6.7, to also clear the 7th region) forces a smaller bank.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`) placed beside `harmonic-resonance` (Group A is un-audited); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (resonance-order relation solved for the bank, `GOVERNANCE.general`
matching the sibling); `test/fixtures/worked-examples.json` (the pinned example); `test/fixtures/compute-map.js`
(`capacitor-bank-for-resonance-order` -> `computeCapacitorBankForResonanceOrder`); `scripts/related-tiles.mjs`
(-> `harmonic-resonance` / `pf-correction` / `transformer-k-factor` / `tdd-ieee-519`); `data/search/aliases.json` (5
collision-checked question aliases: "max capacitor bank to avoid resonance", "cap bank size to stay off the 5th", ...);
the calc-powerquality `POWERQUALITY_RENDERERS` map entry via a hand-written renderer (two number fields) and the id added
to the calc-powerquality declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14
corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the example, the round-trip through
`computeHarmonicResonance` across an MVA/order sweep, the higher-order-smaller-bank monotonicity, and the error seams. The
calc-powerquality.js gzip cap is expected to hold (verify at build, including `check-shells`). Lazy-loaded, absent from
home first paint. Home tile count 1,165 -> 1,166.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+1 fixture, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`;
worked-examples runner; 320 px audit; render + output read to the value (the pinned example -> 9.05 MVAR for a 200-MVA bus
at a 4.7 target order).

## 5. Roadmap position

Pairs the forward resonance tile (`harmonic-resonance`, order from a bank) with its inverse (max bank from a target
order), the two halves of the PF-bank-sizing-against-resonance question. Further Group A power-quality growth stays
evidence-driven.
