# roughlogic.com Specification v1869 -- HVAC Acoustics Module Split

> **Status: LANDED — 2026-09-28.** Move the existing HVAC acoustics and
> rooftop-anchorage band from `calc-hvacsystems.js` to a dedicated lazy-loaded
> `calc-hvacacoustics.js` module. This is structural hardening: calculator IDs,
> formulas, fields, outputs, citations, examples, and Group C assignments
> remain unchanged.

## Scope

Move the contiguous five-calculator spec-v1632..v1636 band covering grille neck
noise, duct breakout noise, silencer insertion loss, mechanical-room sound
transmission, and rooftop curb uplift and anchorage.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-hvacsystems.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-hvacsystems.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
