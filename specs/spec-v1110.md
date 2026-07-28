# roughlogic.com Specification v1110 -- Economic Insulation Thickness (calc-hvac.js, Group C, 1 New Tile)

> **Status: LANDED (2026-07-27). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`**
> (Group C), no new module, group, or dependency. Inherits spec.md through spec-v1109.md.
>
> **The gap, and the evidence for it.** The catalog has three insulation-thickness tiles and none of them
> costs anything: `insulation-thickness` solves to a surface-temperature target,
> `insulation-thickness-for-heat-loss` to a heat-loss budget, and spec-v1024's
> `pipe-insulation-for-condensation` to the dew point. `economic-conductor-sizing` is the same
> economic-optimum pattern but for copper, and it is a two-option payback rather than a cost-minimizing
> thickness. Zero hits for "economic thickness". Discovery batches 4 and 7 both flagged it CLEAR.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

v14 dims lint, worked-example registry, bounds-fuzzer, reviewer signoff. v18/v21 contract: any non-positive
physical or cost input, an efficiency outside (0, 1], or a negative discount rate returns `{ error }`.
Renderer: hand-written non-exported (module convention). No table shipped.

## 2. The tile

### 2.1 `economic-insulation-thickness` -- Economic (Least-Cost) Insulation Thickness

```
inputs:  delta_t_f, bare_r_value (R0, the bare-surface film ~0.5), k_btu_in (0.27),
         operating_hours (8000), energy_cost_per_mmbtu (12), system_efficiency (0.8),
         installed_cost_per_in_sf (3), life_years (10), discount_rate (0.08; 0 = straight line)
compute: CRF = i/(1-(1+i)^-n), or 1/n at zero rate
         C   = dT x hours x $/MMBtu / (1e6 x efficiency)
         annual energy  = C / (R0 + t/k)          falls as 1/R
         annual capital = price x t x CRF          rises linearly
         t_opt = k ( sqrt( C / (k x price x CRF) ) - R0 ), floored at 0
outputs: crf, optimum_thickness_in, not_justified, r_at_optimum, q_optimum, q_bare,
         annual_energy_cost, annual_capital_cost, total_annual_cost, bare_annual_cost,
         annual_savings, first_cost, simple_payback_years, heat_loss_reduction_pct, note
```

**Why the closed form is trustworthy here.** The energy term falls as 1/R and the capital term rises
linearly, so the total has exactly one interior minimum and differentiating gives it directly. The
derivation was checked against a brute-force scan of the cost curve and agreed to four decimals, and **the
fuzzer keeps that check permanently**: it rescans the curve at 0.05-in steps from 0.05 to 12 in and asserts
no thickness beats the reported optimum. That turns a piece of calculus into a standing regression test.

**Worked example (pinned).** 250 F, 8,000 h/yr, $12/MMBtu at 80% efficiency, $3 per inch per ft^2, 10 years
at 8%: CRF 0.14903, optimum **4.12 in**, total $3.75/ft^2-yr against **$60.00 bare** -- heat loss cut 96.8%,
payback 0.21 years. Cross-check: a 60 F line running 300 h/yr on $3 fuel with $12 insulation returns
`not_justified` with a zero optimum.

## 3. What the tile is careful to say

It is a **cost** optimum, not a performance requirement, and comes out deliberately THINNER than a
surface-temperature or condensation limit would demand -- those tiles win wherever they apply. The cost
curve is FLAT near its minimum, so rounding to the next stock thickness costs almost nothing; round up. The
answer is most sensitive to the two numbers people guess at, operating hours and energy price. It is
FLAT-SURFACE geometry, so a small pipe's optimum runs thicker because curvature adds area per inch. And
where nothing pays back, freeze protection, personnel protection, and condensation control are separate
reasons that do not care about payback.

## 4. Wiring

Standard single-tile wiring per spec-v1019 §5, cross-linked with the other insulation tiles. Beyond the
numerical-scan pin, the fuzzer checks that the two cost halves sum to the total, the CRF collapses to 1/n
at zero rate and exceeds it otherwise, the not-justified branch leaves R at bare, and all six sensitivity
directions (hours, price, dT up; insulation cost, life down).
