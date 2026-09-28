# roughlogic.com Specification v1856 -- Group M Open-Channel Module Split

> **Status: LANDED 2026-09-28.** Platform-only cap relief. No calculator ID, formula, output, group, or URL changes.

## Outcome

`calc-treatment.js` has usable growth room again. Its five open-channel measurement calculators move to `calc-openchannel.js`:

- `weir-flow`
- `cipolletti-weir`
- `sluice-gate-flow`
- `broad-crested-weir`
- `weir-head-from-flow`

All five remain in Group M. Their compute functions, examples, citations, schemas, and rendered output stay unchanged.

## Requirements

1. Move the five calculator blocks without changing their behavior.
2. Preserve every public calculator ID, worked example, citation, output, and Group M placement.
3. Update the website module registry, MCP compute registry, generated renderer registry, build copy list, service-worker precache list, and direct test imports.
4. Keep both modules below their gzip caps without raising the `calc-treatment.js` cap.
5. Update living documentation from 91 to 92 calculator modules.

## Proof

Run the focused calculator and bounds tests, module-size gate, full lint, full unit suite, and production build.
