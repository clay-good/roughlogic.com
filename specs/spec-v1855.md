# roughlogic.com Specification v1855 -- Group G Safety Module Split

> **Status: LANDED 2026-09-28.** Platform-only cap relief. No calculator ID, formula, output, group, or URL changes.

## Outcome

`calc-cross.js` has usable growth room again. Four occupational-safety calculators move as one contiguous block to `calc-safety.js`:

- `portable-ladder-setup`
- `hearing-protector-nrr`
- `silica-table-1`
- `lifeline-tension`

All four remain in Group G. Their compute functions, examples, citations, schemas, and rendered output stay unchanged.

## Requirements

1. Move the four calculator blocks without changing their behavior.
2. Preserve every public calculator ID, worked example, citation, output, and Group G placement.
3. Update the website module registry, MCP compute registry, generated renderer registry, build copy list, service-worker precache list, and direct test imports.
4. Keep both modules below their existing gzip caps without raising a cap.
5. Update living documentation from 90 to 91 calculator modules.

## Proof

Run the focused bounds tests, module-size gate, full lint, full unit suite, and production build.
