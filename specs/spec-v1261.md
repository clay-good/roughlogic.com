# roughlogic.com Specification v1261 -- One-Way ANOVA (calc-edu.js, Group Y, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-edu.js`** (Group Y),
> no new module or dependency (reuses the `betainc` helper already exported by `pure-math.js`). Inherits spec.md
> through spec-v1260.md.
>
> **The gap (family-completion).** The inferential-statistics family has one/two/paired t-tests and chi-square
> goodness-of-fit but no way to compare THREE OR MORE group means. One-way ANOVA is the missing generalization of
> the two-sample t-test.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
fewer than two groups, a within-group df below 1 (N - k < 1), no within-group variance, or a non-string input returns
`{ error }`. Citation discipline (v19/v22): OpenIntro Statistics Ch. 7 (comparing many means), `GOVERNANCE.general`;
the F-distribution p-value reuses the bundled regularized incomplete beta. **Verified exactly against
`scipy.stats.f_oneway`.**

## 2. The tile

### 2.1 `one-way-anova` -- One-Way ANOVA (Compare 3+ Group Means)

```
SSB = sum n_i (mean_i - grand)^2          df_between = k - 1
SSW = sum sum (x - group mean)^2          df_within  = N - k
F   = (SSB/df_between) / (SSW/df_within)
p   = I(x; df_within/2, df_between/2)  (regularized incomplete beta), x = df_within/(df_within + df_between*F)
eta^2 = SSB / (SSB + SSW)
```

**Input:** `groups_text` -- one group per line, values separated by spaces or commas.

**Outputs:** F-statistic, df (between, within), p-value, SSB/SSW, MSB/MSW, eta^2, group count, N, significance flag.

## 3. Worked example

Three groups `88 90 92 85 91` / `79 82 80 78 84` / `93 95 91 90 94`:

```
F = 32.236 on df 2 and 12,  p = 1.49e-5,  eta^2 = 0.843   (scipy.stats.f_oneway: F=32.235955, p=1.4930551e-05)
```

Hand-computed cross-check `1 2 3` / `2 3 4` / `4 5 6`: SSB 14, SSW 6, F = (14/2)/(6/6) = 7.0, p = 0.027, eta^2 = 0.7
(scipy p = 0.026999...).

## 4. Scope and non-goals

One-way (single factor) only. ANOVA flags THAT at least one group mean differs, not which pair -- a post-hoc test
(Tukey HSD) locates it, and is out of scope. Assumes roughly normal groups with similar variances (a Welch/Brown-Forsythe
correction is separate). Two-way ANOVA and repeated-measures designs are separate. A statistics aid; the study design
governs. calc-edu.js cap raised 37000 -> 40000 B.
