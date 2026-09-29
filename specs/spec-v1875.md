# roughlogic.com Specification v1875 -- Education Assessment Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing education assessment
> and statistical-inference band from `calc-edu.js` to a dedicated lazy-loaded
> `calc-educationassessment.js` module. This is structural hardening:
> calculator IDs, formulas, fields, outputs, citations, examples, and Group Y
> assignments remain unchanged.

## Scope

Move the contiguous spec-v20 through spec-v1264 calculators covering final and
category grades, one- and two-sample t-tests, paired t-tests, one-way ANOVA,
chi-square independence, Spearman correlation, and two-proportion z-tests.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-edu.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-edu.js` is below a reduced gzip cap, and the new module has a measured
   cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
