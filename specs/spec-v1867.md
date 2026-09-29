# roughlogic.com Specification v1867 -- Fire Water-Supply Module Split

> **Status: LANDED — 2026-09-28.** Move the existing fire-ground water-supply
> operations cluster from `calc-fire.js` to a dedicated lazy-loaded
> `calc-firewater.js` module. This is structural hardening: calculator IDs,
> formulas, fields, outputs, citations, examples, and Group F assignments
> remain unchanged.

## Scope

Move the contiguous 10-calculator spec-v389..v605 cluster covering hydrant
available flow, structural flow estimates, relay pumping, draft and vacuum
lift, tanker shuttle planning, and foam-eductor hose limits.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-fire.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-fire.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
