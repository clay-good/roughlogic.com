# roughlogic.com Specification v1863 -- Stage Production Module Split

> **Status: LANDED — 2026-09-28.** Move the existing stage production-systems
> bench from `calc-stage.js` to a dedicated lazy-loaded
> `calc-stageproduction.js` module. This is structural hardening: calculator
> IDs, formulas, fields, outputs, citations, examples, and Group N assignments
> remain unchanged.

## Scope

Move the contiguous 13-calculator spec-v1364..v1376 band covering line-array
geometry, delay and subwoofer alignment, driver spacing, wireless coordination,
RF loss, chain-hoist duty, projection, color correction, haze, stage decks,
video walls, and outdoor-stage wind.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-stage.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-stage.js` is below a reduced gzip cap, and the new module has a measured
   cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
