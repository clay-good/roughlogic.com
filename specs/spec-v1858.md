# roughlogic.com Specification v1858 -- Soil-Properties Module Split

> **Status: LANDED — 2026-09-28.** Move the existing soil-characterization,
> laboratory-testing, and aggregate-grading bench from `calc-earthwork.js` to
> a dedicated lazy-loaded `calc-soilproperties.js` module. This is structural
> hardening: calculator IDs, formulas, fields, outputs, citations, examples,
> and Group E assignments remain unchanged.

## Scope

Move these 9 calculators as one contiguous material-properties workflow:

- `relative-compaction`
- `soil-relative-density`
- `soil-phase-relations`
- `soil-permeability`
- `atterberg-indices`
- `soil-activity`
- `fineness-modulus`
- `fine-aggregate-grading`
- `soil-gradation-coefficients`

Update the website and MCP registries, build and service-worker inventories,
direct test imports, the metric-input allowlist, generated indexes, and the
documented module counts. Do not raise the existing `calc-earthwork.js` cap.

## Acceptance

1. The moved source block is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-earthwork.js` is below its existing gzip cap, and the new module has
   a measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
