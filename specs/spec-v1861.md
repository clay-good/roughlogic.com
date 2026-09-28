# roughlogic.com Specification v1861 -- Steel Panel-Zone Module Split

> **Status: LANDED — 2026-09-28.** Move the existing AISC panel-zone shear,
> doubler-plate, and high-column-axial bench from `calc-steel.js` to a dedicated
> lazy-loaded `calc-steelpanelzone.js` module. This is structural hardening:
> calculator IDs, formulas, fields, outputs, citations, examples, and Group E
> assignments remain unchanged.

## Scope

Move these 3 connected calculators:

- `steel-panel-zone-shear`
- `steel-doubler-plate`
- `steel-panel-zone-axial`

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Do not
raise the existing `calc-steel.js` cap.

The adjacent slip-critical-with-tension calculator remains in `calc-steel.js`
because it calls that module's existing `computeSteelBoltSlipCritical`
calculation directly. Moving it would create a cross-module dependency and
would not make the panel-zone module more cohesive.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-steel.js` is below a reduced gzip cap, and the new module has a measured
   cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
