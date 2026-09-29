# roughlogic.com Specification v1874 -- Trucking Field Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing trucking
> field-operations band from `calc-trucking.js` to a dedicated lazy-loaded
> `calc-truckingfield.js` module. This is structural hardening: calculator IDs,
> formulas, fields, outputs, citations, examples, and Group J assignments remain
> unchanged.

## Scope

Move the contiguous spec-v1377 through spec-v1385 calculators covering cargo
securement, kingpin-to-rear-axle compliance, downgrade speed, air-brake stroke,
oversize permits, hazmat placarding, idle fuel cost, flatbed tarps, and deck
point loads.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-trucking.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-trucking.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
