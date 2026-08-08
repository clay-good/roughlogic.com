# roughlogic.com Specification v1263 -- Spearman Rank Correlation (calc-edu.js, Group Y, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-edu.js`** (Group Y),
> no new module or dependency (reuses `parseNumberList` and the `tcdf` helper). Inherits spec.md through spec-v1262.md.
>
> **The gap (family-completion).** The correlation/regression family has `pearson-correlation` and `linear-regression`
> but no nonparametric rank correlation -- the standard companion when the relationship is monotonic-but-not-linear
> or the data are ordinal.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract:
fewer than 3 paired values, mismatched series lengths, or a series with no variation returns `{ error }`; a perfect
monotonic fit (rho = +/-1) is reported as a flag with p = 0, never a non-finite field. Citation discipline (v19/v22):
OpenIntro Statistics (rank correlation), `GOVERNANCE.education`; the Student-t CDF reuses the bundled helper.
**Verified exactly against `scipy.stats.spearmanr`.**

## 2. The tile

### 2.1 `spearman-rank-correlation` -- Spearman Rank Correlation (rho)

```
rho = Pearson r computed on the ranks of x and y (tied values take the average rank)
Two-sided test for rho = 0:  t = rho * sqrt((n - 2) / (1 - rho^2)) on n - 2 df
p = 2 * (1 - tcdf(|t|, n - 2))
```

**Inputs:** `x_values`, `y_values` -- two equal-length series (commas, spaces, or new lines).

**Outputs:** n, rho, rho^2, direction, strength, df, t, perfect-fit flag, p-value, significance flag, small-n warning.

## 3. Worked example

x = 1..10, y = `3 1 4 1 5 9 2 6 5 8`:

```
rho = 0.62806,  p = 0.05184   (scipy.stats.spearmanr: statistic=0.6280604563186774, pvalue=0.05184120984456854)
```

Tie cross-check x = 1..5, y = `2 4 5 4 5`: the tied y values take average ranks (1, 2.5, 4.5, 2.5, 4.5), giving
rho = 0.737865 (scipy agrees to all digits).

## 4. Scope and non-goals

Measures monotonic (not specifically linear) association; it is not causation and a strong rho can still reflect a
lurking variable. The p-value uses the t approximation (matching scipy's default); for very small samples an exact
permutation test is preferred and is out of scope. Kendall's tau is a separate rank measure. A statistics aid; the
study design governs.
