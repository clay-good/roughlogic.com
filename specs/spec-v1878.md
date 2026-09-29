# roughlogic.com Specification v1878 -- Arboriculture Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing crown, transplanting,
> cabling, stump-grinding, and soil-volume calculator band from
> `calc-arborist.js` to a dedicated lazy-loaded `calc-arboriculture.js`
> module. This is structural hardening: calculator IDs, formulas, fields,
> outputs, citations, examples, and Group L assignments remain unchanged.

## Scope

Move the contiguous spec-v1696 through spec-v1700 calculators covering crown
reduction leaf area, root-ball size and weight, tree-cabling rating,
stump-grinding volume, and soil volume for canopy growth.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-arborist.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-arborist.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
