# roughlogic.com Specification v1264 -- Two-Proportion z-Test (calc-edu.js, Group Y, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-edu.js`** (Group Y),
> no new module or dependency (reuses the `normCdf` helper already in `pure-math.js`). Inherits spec.md through
> spec-v1263.md.
>
> **The gap (family-completion).** The hypothesis-test family (t-tests, chi-square, ANOVA) had no test for two
> proportions -- the standard question when each group is a count of successes out of a total.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
a non-positive total, a successes count outside [0, n], or a zero pooled standard error (both 0% or both 100%)
returns `{ error }`. Citation discipline (v19/v22): OpenIntro Statistics Ch. 6 (inference for two proportions),
`GOVERNANCE.education`; the standard-normal CDF reuses the bundled helper. **Verified against
`statsmodels.stats.proportion.proportions_ztest` (pooled) and scipy's normal CDF.**

## 2. The tile

### 2.1 `two-proportion-z-test` -- Two-Proportion z-Test

```
p1 = x1/n1,  p2 = x2/n2
p_pool = (x1 + x2)/(n1 + n2)
z = (p1 - p2) / sqrt(p_pool (1 - p_pool)(1/n1 + 1/n2))       (POOLED SE, valid under the null)
two-sided p = 2(1 - normCdf(|z|));  one-sided = 1 - normCdf(|z|)
difference CI = (p1 - p2) +/- z_crit * sqrt(p1(1-p1)/n1 + p2(1-p2)/n2)   (UNPOOLED SE)
```

**Inputs:** x1, n1, x2, n2, tail (two/one), alpha.

**Outputs:** p1, p2, difference, pooled p, z-statistic, p-value, difference CI, significance flag, small-cell warning.

## 3. Worked example

45/100 vs 30/100:

```
p_pool = 75/200 = 0.375;  SE = sqrt(0.375 x 0.625 x 0.02) = 0.0684653
z = 0.15 / 0.0684653 = 2.190890;  two-sided p = 2(1 - Phi(2.190890)) = 0.028460
```

Cross-check, no real difference 20/200 vs 15/180: z = 0.560981, p = 0.574810 (matches scipy's normal CDF to all digits;
identical to statsmodels `proportions_ztest` pooled).

## 4. Scope and non-goals

Pooled z-test for the hypothesis test; the difference confidence interval uses the unpooled SE (standard convention).
The normal approximation needs about 5 successes AND 5 failures in each group (flagged); below that Fisher's exact test
is preferred and is out of scope. A statistics aid; the study design governs. calc-edu.js cap raised 40000 -> 44000 B.
