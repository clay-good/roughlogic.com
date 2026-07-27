# roughlogic.com Specification v1022 -- Concrete Anchor Tension-Shear Interaction (calc-concrete.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-concrete.js`**
> (Group E), no new module, group, or dependency. Inherits spec.md through spec-v1021.md. Closes the anchor
> family: the tension tile's citation named "combined shear-tension" as a separate check from the very start,
> and with spec-v1019/v1020/v1021 landed, every input this tile needs now exists in the catalog.
>
> **Dupe status.** `steel-bolt-tension-shear` is AISC J3.7 (a stress-reduction formula for structural bolts);
> `steel-h1-interaction` is the AISC beam-column unity check. Nothing implements the ACI 318-19 Section 17.8
> trilinear rule with its 0.2 exemptions and 1.2 combined limit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: non-finite inputs,
negative demands, or non-positive capacities return `{ error }`. Citation discipline: ACI 318-19 by section
number only. `GOVERNANCE.general`. Renderer: `_simpleRenderer`.

## 2. The tile

### 2.1 `concrete-anchor-interaction` -- Concrete Anchor Tension-Shear Interaction (ACI 318-19 17.8)

```
inputs:  nua_lb (factored tension demand), vua_lb (factored shear demand),
         phi_nn_lb (governing design tension capacity: LEAST of steel, breakout, pullout, blowout),
         phi_vn_lb (governing design shear capacity: LEAST of steel, shear breakout, pryout)
compute: tension_ratio = Nua / phiNn;  shear_ratio = Vua / phiVn
         each ratio must be <= 1.0 on its own (17.8.1 / 17.8.2) -- the interaction NEVER waives that
         branch (trilinear, 17.8.3):
           shear_ratio  <= 0.2  ->  full tension strength permitted (check tension_ratio <= 1.0)
           tension_ratio <= 0.2 ->  full shear strength permitted (check shear_ratio <= 1.0)
           else                 ->  tension_ratio + shear_ratio <= 1.2
outputs: tension_ratio, shear_ratio, branch, sum_ratio, limit, utilization_pct, pass, note
```

**Verification.** The trilinear rule is stated identically in the Williams Form 318-19 reference
(Nua/phiNn + Vua/phiVn <= 1.2, Section 17.8.3) and the Panache Ch.17 guide (full strength permitted when the
companion demand is under 20%); the rule is continuous at the 0.2 corners (at shear_ratio exactly 0.2 and
tension_ratio 1.0, the exemption branch and the 1.2 sum agree), and the fuzzer pins that continuity.

**Worked example (pinned).** Chained from the spec-v1021 example anchor (phiNsa = 9,831 lb, phiVsa = 5,112 lb)
under Nua = 6,000 lb and Vua = 3,000 lb: tension_ratio 0.610, shear_ratio 0.587, both over 0.2 -> interaction
branch, sum 1.197 <= 1.2 -- PASSES by a hair while each individual check is comfortable. That near-miss is the
lesson: an anchor fine in tension and fine in shear can still be one bolt-size away from failing the combined
check.

## 3. Scope limits

The user supplies the two governing design capacities (each the least of its mode tiles, same phi basis);
this tile does not recompute them. Applies per anchor or per group once the governing capacities are known.
Seismic (17.10) modifications are upstream of the capacities and not modeled here. ACI 318 Chapter 17 and the
engineer of record govern.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5. Fuzzer pins the worked example, all three branches, the 0.2
corner continuities, the individual-cap enforcement inside the exempt branches (tension_ratio 1.05 at
shear_ratio 0.05 FAILS), the 1.2 seam, and zero-demand degenerate cases.
