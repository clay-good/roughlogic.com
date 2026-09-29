# roughlogic.com Specification v1870 -- HVAC Airside Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing HVAC airside field-method
> band from `calc-hvac.js` to a dedicated lazy-loaded
> `calc-hvacairside.js` module. This is structural hardening: calculator IDs,
> formulas, fields, outputs, citations, examples, and Group C assignments
> remain unchanged.

## Scope

Move the contiguous 13-calculator spec-v347 through spec-v408 band covering
duct heat gain, grille face velocity, ADPI selection, vibration isolation,
air-density correction, psychrometric coil analysis, fan affinity laws,
Darcy friction factor, and Manual D friction rate.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-hvac.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-hvac.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
