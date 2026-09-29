# roughlogic.com Specification v1876 -- Molecular Lab Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing molecular and cell-biology
> calculator band from `calc-lab.js` to a dedicated lazy-loaded
> `calc-labmolecular.js` module. This is structural hardening: calculator IDs,
> formulas, fields, outputs, citations, examples, and Group T assignments remain
> unchanged.

## Scope

Move the contiguous spec-v20 through spec-v635 calculators covering primer
melting temperature, viable plate counts, reagent-stock molarity, nucleic-acid
concentration, ligation ratios, cell doubling and growth, and Michaelis-Menten
kinetics and its inverse.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-lab.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-lab.js` is below a reduced gzip cap, and the new module has a measured
   cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
