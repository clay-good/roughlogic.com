# roughlogic.com Specification v1868 -- Solar Field Module Split

> **Status: LANDED — 2026-09-28.** Move the existing solar, storage, and EV
> field-design tail from `calc-solar.js` to a dedicated lazy-loaded
> `calc-solarfield.js` module. This is structural hardening: calculator IDs,
> formulas, fields, outputs, citations, examples, and Group A assignments
> remain unchanged.

## Scope

Move the contiguous 10-calculator spec-v559..v1248 tail covering PV equipment
grounding, solar position and shadow geometry, rail and ballast takeoff, DC
shunt measurement, EV charging range, battery-bank configuration, and bifacial
PV gain.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-solar.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-solar.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
