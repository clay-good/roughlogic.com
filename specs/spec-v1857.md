# roughlogic.com Specification v1857 -- Soil-Settlement Module Split

> **Status: LANDED — 2026-09-28.** Move the existing soil-settlement and
> consolidation bench from `calc-geotech.js` into a dedicated lazy-loaded
> `calc-soilsettlement.js` module. This is a structural hardening change: all
> calculator IDs, formulas, fields, outputs, citations, examples, and Group E
> assignments remain unchanged.

## Scope

Move these 9 calculators together because they form one settlement workflow:

- `soil-consolidation-settlement`
- `overconsolidated-settlement`
- `secondary-compression-settlement`
- `settlement-limit-load`
- `footing-eccentric-pressure`
- `boussinesq-surcharge-wall`
- `consolidation-time-rate`
- `consolidation-degree`
- `coefficient-of-consolidation`

Update `tool-modules.js`, the compute and renderer maps, the production build
list, and the service-worker precache list. Rebuild the generated MCP indexes
and documentation. Update direct unit-test imports and the documented module
count from 92 to 93.

## Acceptance

1. The moved functions and renderers are byte-for-byte equivalent apart from
   the module-local renderer registry name.
2. Every moved calculator resolves through the website and MCP registries.
3. `calc-geotech.js` is below its existing gzip cap, and the new module has an
   explicit cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
