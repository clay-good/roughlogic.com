# roughlogic.com Specification v1854 -- Group R Operations-Finance Module Split

> **Status: LANDED 2026-09-28.** Platform-only cap relief. No calculator ID, formula, output, group, or URL changes.

## Outcome

`calc-accounting.js` has usable growth room again. Its final three operations-finance calculators move as one
contiguous, dependency-free block to `calc-operations-finance.js`:

- `eoq-order-quantity`
- `reorder-point`
- `units-of-production-depr`

The first two size inventory orders and replenishment. The third assigns an equipment cost by production volume.
All three are activity-driven operating-finance tools, and all remain in Group R.

## Requirements

1. Move each compute, example, and renderer byte-for-byte apart from the renderer-map name.
2. Preserve every public calculator ID, worked example, citation, output, and Group R placement.
3. Update the website module registry, MCP compute registry, generated renderer registry, build copy list, and
   service-worker precache list.
4. Keep both modules below their existing gzip caps without raising a cap.
5. Update living documentation from 89 to 90 calculator modules.

## Proof

Run the focused bounds tests, module-size gate, full lint, full unit suite, and production build.
