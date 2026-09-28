# roughlogic.com Specification v1866 -- Rigging Field Module Split

> **Status: LANDED — 2026-09-28.** Move the existing rigging field-safety
> tail from `calc-rigging.js` to a dedicated lazy-loaded
> `calc-riggingfield.js` module. This is structural hardening: calculator
> IDs, formulas, fields, outputs, citations, examples, and Group Z assignments
> remain unchanged.

## Scope

Move the contiguous five-calculator spec-v938..v1157 tail covering wire-rope
clips, crane boom geometry, block-and-tackle reeving, guy-wire tension, and
crane power-line clearance.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-rigging.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-rigging.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
