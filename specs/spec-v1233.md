# roughlogic.com Specification v1233 -- ASME UG-32 Formed-Head Thickness (calc-pipefit.js, Group B, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-pipefit.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v1232.md.
>
> **The gap.** Sibling names the gap: `asme-shell-thickness` (spec-v1113, UG-27 shells) states "heads ... are all
> outside this tile." This is the UG-32 head companion.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-finite input (via `_finiteGuard`), a non-positive pressure / diameter / stress, a joint efficiency outside (0, 1],
a negative corrosion allowance, an unknown head type, or a pressure that drives the denominator non-positive returns
`{ error }`. Citation discipline (v19/v22): ASME BPVC Section VIII Division 1, UG-32, `GOVERNANCE.general`, distinct
from the UG-27 `asme-shell-thickness` tile. **No allowable-stress or joint-efficiency table is reproduced** -- both are
entered; the three head equations and the 0.885 coefficient are verified against two independent sources.

## 2. The tile

### 2.1 `asme-head-thickness` -- ASME UG-32 Formed-Head Thickness

```
2:1 ellipsoidal   (UG-32(d)):  t = P D / (2 S E - 0.2 P)          D = inside diameter
hemispherical     (UG-32(f)):  t = P R / (2 S E - 0.2 P)          R = D / 2
torispherical F&D (UG-32(e)):  t = 0.885 P L / (S E - 0.1 P)      L = D, r = 0.06 L (standard head)
corroded/final:   t_final = t + corrosion allowance
```

**Inputs:** design pressure (psig), inside diameter D (in, corroded), allowable stress at design temp (psi), joint
efficiency E, corrosion allowance (in), head type.

**Outputs:** required thickness (strength and with allowance), the MAWP at the required thickness, and S x E.

## 3. Worked example

`P = 150 psig, D = 48 in, S = 17,500 psi, E = 0.85, CA = 0.0625 in`:

```
2:1 ellipsoidal   t = 150 x 48 / (2 x 14875 - 0.2 x 150) = 0.2423 in  (0.3048 with allowance)
hemispherical     t = 150 x 24 / (2 x 14875 - 0.2 x 150) = 0.1211 in  (thinnest -- strongest shape)
torispherical     t = 0.885 x 150 x 48 / (14875 - 0.1 x 150) = 0.4288 in  (thickest)
```

Cross-check (CASTI Guidebook Example 8.1): a standard torispherical head at P 150, L 121.8 in, S 12,000, E 1.0 gives
t = 0.885 x 150 x 121.8 / (12000 - 15) = 1.349 in, matching the guidebook's 1.350 in.

## 4. Coefficient verification and non-goals

All three forms and the standard-F&D 0.885 coefficient were confirmed against two independent sources: the CASTI
Guidebook to ASME Section VIII Div 1 (Eq 8.1 for the ellipsoidal head and worked Example 8.1 for the torispherical head)
and ASME UG-32. Non-2:1 ellipsoidal ratios use the K factor and non-standard torispherical L/r ratios use the M factor
of Appendix 1-4 -- both outside this tile. Knuckle thinning during forming, the minimum-thickness-after-forming rule,
staying/stiffening, and external pressure are separate. A check, not a stamped design; ASME Section VIII and the vessel
engineer govern.
