# roughlogic.com Specification v1872 -- Electrical References Module Split

> **Status: LANDED -- 2026-09-28.** Move the existing NEC field-reference band
> from `calc-references.js` to a dedicated lazy-loaded
> `calc-electricalreferences.js` module. This is structural hardening:
> calculator IDs, formulas, fields, outputs, citations, examples, and Group A
> assignments remain unchanged.

## Scope

Move the contiguous spec-v177, spec-v178, and spec-v187 calculators covering
NEC Table 300.5 burial depth, Chapter 3 raceway and cable support spacing, and
680.26 pool equipotential bonding.

Update the website and MCP registries, build and service-worker inventories,
direct test imports, generated indexes, and documented module counts. Reduce
the existing `calc-references.js` cap rather than raising it.

## Acceptance

1. The moved calculator source is unchanged apart from its module-local
   renderer registry.
2. Every moved calculator resolves through both the website and MCP paths.
3. `calc-references.js` is below a reduced gzip cap, and the new module has a
   measured cap with normal headroom.
4. `npm run lint`, `npm test`, and `npm run build` pass.
