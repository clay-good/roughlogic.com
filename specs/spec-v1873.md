# roughlogic.com Specification v1873 -- Marine and Aviation Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing marine and aviation
> field-reference band from `calc-mechanic.js` to a dedicated lazy-loaded
> `calc-marineaviation.js` module. This is structural hardening: calculator
> IDs, formulas, fields, outputs, citations, examples, and Group K assignments
> remain unchanged.

## Scope

Move the contiguous spec-v1640 through spec-v1647 calculators covering vessel
stability, marine shaft sizing, house-battery charging, travel-lift rigging,
dock piling, aircraft control-cable tension, propeller balance, and aviation
fuel weight.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-mechanic.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-mechanic.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
