# roughlogic.com Specification v1272 -- Direct-Analysis Stiffness Reduction tau_b (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`**
> (Group E, structural steel), no new module or dependency. Inherits spec.md through spec-v1271.md.
>
> **The gap (three siblings name it).** The `steel-b1-amplifier`, `steel-effective-length-k`, and
> `steel-column-stiffness-ratio-g` tiles all reference the AISC direct analysis method's reduced flexural
> stiffness "0.8 tau_b EI" and each states it "does not apply the inelastic tau_b reduction." Nothing computed
> tau_b. This completes the steel stability family.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive Pr / Fy / Ag, a bad method token, or an axial demand above yield (alpha Pr > Py, where tau_b is
undefined) returns `{ error }`. Citation discipline (v19/v22): AISC 360-22 Section C2.3, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `steel-tau-b-stiffness-reduction` -- Direct-Analysis Stiffness Reduction tau_b (AISC 360 C2.3)

```
Py = Fy Ag                                            (axial yield strength, kip)
ratio = alpha Pr / Py         alpha = 1.0 (LRFD) / 1.6 (ASD)
tau_b = 1.0                          when ratio <= 0.5
tau_b = 4 ratio (1 - ratio)          when ratio > 0.5      (AISC 360-22 Eq. C2-2)
reduced flexural stiffness EI* = 0.8 tau_b EI            (axial EA* = 0.8 EA)
```

**Inputs:** required axial compression Pr (kip), yield strength Fy (ksi, default 50), gross area Ag (in^2),
design basis (LRFD / ASD).

**Outputs:** tau_b, the flexural stiffness factor 0.8 tau_b, the ratio alpha Pr / Py (with Py).

## 3. Worked example

W10x49 (Ag 14.4 in^2, Fy 50 ksi), Pr 400 kip, LRFD:

```
Py = 50 x 14.4 = 720 kip
ratio = 1.0 x 400 / 720 = 0.5556  ( > 0.5 )
tau_b = 4 x 0.5556 x (1 - 0.5556) = 0.9877
EI* = 0.8 x 0.9877 = 0.7901 EI
```

Cross-check: the same section at Pr 300 kip is at ratio 0.417 (<= 0.5), so tau_b = 1.0 and the reduction is the
flat 0.8. On the ASD basis (alpha 1.6) the reduction reaches the Pr-400 LRFD value at only 250 kip. tau_b falls
toward 0 as the axial load approaches Py, softening a heavily loaded column so the second-order analysis captures
its real drift.

## 4. Scope and non-goals

An analysis stiffness input for a second-order (direct analysis method) run, not a member strength check. AISC also
permits tau_b = 1.0 for all members if an additional notional load of 0.001 alpha Yi is applied at each level (not
modeled here). Feeds the 0.8 tau_b EI the B1, K, and G stability tiles reference. A design aid; the structural
engineer of record's stamped design governs.
