# roughlogic.com Specification v1862 -- Concrete Placement Module Split

> **Status: LANDED — 2026-09-28.** Move the existing concrete placement,
> post-tensioning, and tilt-up field-operations bench from `calc-concrete.js` to
> a dedicated lazy-loaded `calc-concreteplacement.js` module. This is structural
> hardening: calculator IDs, formulas, fields, outputs, citations, examples, and
> Group E assignments remain unchanged.

## Scope

Move these 5 connected calculators:

- `concrete-pump-line-pressure`
- `boom-pump-reach`
- `post-tension-elongation`
- `tilt-up-lift-stress`
- `tilt-up-brace-load`

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-concrete.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-concrete.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
