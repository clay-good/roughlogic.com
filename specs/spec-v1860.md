# roughlogic.com Specification v1860 -- Electrical-Field Module Split

> **Status: LANDED — 2026-09-28.** Move the existing field-installation,
> conductor-takeoff, welder-circuit, inverter-circuit, and field-measurement
> bench from `calc-electrical.js` to a dedicated lazy-loaded
> `calc-electricalfield.js` module. This is structural hardening: calculator
> IDs, formulas, fields, outputs, citations, examples, and Group A assignments
> remain unchanged.

## Scope

Move these 13 calculators as one contiguous field-electrical workflow:

- `cable-reel-capacity`
- `wire-pulling-lubricant`
- `branch-circuit-wire-footage`
- `microinverter-branch-count`
- `welder-arc-circuit-conductor`
- `welder-resistance-circuit-conductor`
- `battery-inverter-dc-conductor`
- `pv-ac-output-circuit`
- `soil-resistivity-wenner`
- `max-circuit-length-for-vd`
- `open-delta-transformer`
- `conduit-nipple-60-fill`
- `mwbc-voltage-drop`

Update the website and MCP registries, build and service-worker inventories,
direct test imports, search preview metadata, generated indexes, integrity
hashes, and documented module counts. Do not raise the existing
`calc-electrical.js` cap.

The parallel-raceway EGC calculator remains in `calc-electrical.js` because it
calls that module's existing `computeEGCSize` table directly. Moving it would
create a cross-module dependency and would not make the field module more
self-contained.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local renderer
   registry name.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-electrical.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
