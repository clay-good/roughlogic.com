# roughlogic.com Specification v1871 -- Specialty Trades Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing specialty-building and
> temporary-works band from `calc-construction.js` to a dedicated lazy-loaded
> `calc-specialtytrades.js` module. This is structural hardening: calculator
> IDs, formulas, fields, outputs, citations, examples, and Group E assignments
> remain unchanged.

## Scope

Move the final 11 calculators in `calc-construction.js`: the spec-v1425 through
spec-v1434 elevator, glazing, canopy, overhead-door, window-film, insulating-
glass, and escalator band, plus the spec-v1686 through spec-v1689 scaffold,
mast-climber, suspended-scaffold, and slab-shoring band.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-construction.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-construction.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
