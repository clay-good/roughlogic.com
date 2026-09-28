# roughlogic.com Specification v1864 -- Steam Pressure Module Split

> **Status: LANDED — 2026-09-28.** Move the existing steam pressure and
> pressure-vessel bench from `calc-pipefit.js` to a dedicated lazy-loaded
> `calc-steampressure.js` module. This is structural hardening: calculator
> IDs, formulas, fields, outputs, citations, examples, and group assignments
> remain unchanged.

## Scope

Move the contiguous six-calculator spec-v588..v1233 tail covering steam PRV
capacity and area, boiler blowdown, radiator EDR output, and ASME shell and head
thickness.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-pipefit.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-pipefit.js` is below a reduced gzip cap, and the new module has a measured
   cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
