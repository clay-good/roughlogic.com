# roughlogic.com Specification v1273 -- Sidesway Moment Amplifier B2 (calc-steel.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-08-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-steel.js`**
> (Group E, structural steel), no new module or dependency. Inherits spec.md through spec-v1272.md.
>
> **The gap (sibling names it).** The `steel-b1-amplifier` tile computes the nonsway amplifier and its own note
> says "the sidesway B2 (P-Delta) ... are separate." The amplified-first-order method is Mr = B1 Mnt + B2 Mlt;
> without B2 the pair is incomplete. This adds the B2 term.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive Pstory / H / L / drift, Pmf outside [0, Pstory], a bad method token, or a story at its sidesway
buckling load (alpha Pstory >= Pe,story) returns `{ error }`. Citation discipline (v19/v22): AISC 360-22 Appendix
8.2.2, by name, `GOVERNANCE.general`.

## 2. The tile

### 2.1 `steel-b2-amplifier` -- Beam-Column Sidesway Moment Amplifier B2 (AISC 360 App. 8)

```
RM = 1 - 0.15 (Pmf / Pstory)
Pe,story = RM (H L / dH)                 H = story shear producing the drift dH; L = story height
B2 = max(1, 1 / (1 - alpha Pstory / Pe,story))      alpha = 1.0 (LRFD) / 1.6 (ASD)
```

**Inputs:** total story vertical load Pstory (kip), moment-frame column load Pmf (kip, 0 = braced), story shear H
(kip), story height L (ft), first-order interstory drift under H (in), design basis (LRFD / ASD).

**Outputs:** B2, Pe,story (kip), RM, alpha Pstory / Pe,story.

## 3. Worked example

Pstory 2,000 kip (Pmf 1,200), story shear 100 kip, height 14 ft, first-order drift 0.5 in, LRFD:

```
RM = 1 - 0.15 (1200/2000) = 0.91
Pe,story = 0.91 x 100 x (14 x 12) / 0.5 = 30,576 kip
B2 = 1 / (1 - 1.0 x 2000 / 30,576) = 1.070
```

Cross-check: doubling the drift to 1.0 in halves Pe,story (15,288 kip) and raises B2 to 1.150; a braced frame
(Pmf 0) gives RM 1.0; the ASD basis (alpha 1.6) amplifies more. Because B2 depends on the whole story's gravity
load against its lateral stiffness, a flexible (high-drift) story amplifies every column's sway moment.

## 4. Scope and non-goals

The B2 term of the amplified-first-order method (Mr = B1 Mnt + B2 Mlt); B1 is its own tile. AISC flags a story with
B2 above about 1.7 as too flexible for this method (use a rigorous second-order analysis). The drift dH is taken
under the reduced (0.8 tau_b) stiffness of the direct analysis method (see `steel-tau-b-stiffness-reduction`). A
design aid; the structural engineer of record's stamped design governs.
