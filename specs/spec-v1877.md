# roughlogic.com Specification v1877 -- Contractor Finance Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing contractor cost,
> billing, and insurance calculator band from `calc-accounting.js` to a
> dedicated lazy-loaded `calc-contractorfinance.js` module. This is structural
> hardening: calculator IDs, formulas, fields, outputs, citations, examples,
> and Group R assignments remain unchanged.

## Scope

Move the contiguous spec-v362 through spec-v446 calculators covering labor
burden, equipment hourly cost, overhead recovery, work-in-progress revenue,
change-order markup, retainage, surety bond premiums, workers' compensation
experience modification, and prevailing-wage fringe costs.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-accounting.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-accounting.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
