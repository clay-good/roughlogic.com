# roughlogic.com Specification v1865 -- Instrumentation Module Split

> **Status: LANDED — 2026-09-28.** Move the existing instrumentation bench
> from `calc-lowvoltage.js` to a dedicated lazy-loaded
> `calc-instrumentation.js` module. This is structural hardening: calculator
> IDs, formulas, fields, outputs, citations, examples, and group assignments
> remain unchanged.

## Scope

Move the contiguous nine-calculator spec-v946..v1226 tail covering 4-20 mA
linear and DP-flow scaling, RTD and thermistor conversion, pulse flowmeters,
loop voltage, hydrostatic DP level, and PID tuning.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, the US-defaults allowlist, and documented
module counts. Reduce the existing `calc-lowvoltage.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-lowvoltage.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
