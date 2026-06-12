# roughlogic.com Specification v49 — README Catalog-Count Gate (+ diagram drift fix)

> **Implementation status: CLOSED 2026-06-12 (package stamped 0.44.2, a
> patch).** v49 is a doc-accuracy fix plus the gate that prevents its recurrence,
> in the lineage of spec-v45 / v46 / v48 (claim audits that became gates). It
> inherits everything from spec.md through spec-v48.md and changes no shipped
> output -- no tiles, no calculator changes. **No new dependencies, no telemetry,
> no AI.**

## 1. The finding

The README states the catalog size in many places. The per-spec count-bump recipe
updates the prose and the cheat-sheet table, and a few sessions ago it learned to
edit the **correctness-pipeline** Mermaid nodes explicitly (because those glue the
number to a literal `\n` -- `corpus row\n881` -- and a `\b<old>\b` substitution
does not match a digit glued to the `n` of `\n`). But two OTHER Mermaid diagrams
were never on that explicit-edit list, so their glued counts silently rotted:

- The **architecture** diagram read `calc-*.js\n28 group modules` -- the module
  count had moved 28 -> 29 (spec-v40 `calc-shop.js`) -> 30 (spec-v42
  `calc-gas.js`).
- The **prerendered-shell** diagram read `\n555 static shells` and
  `sitemap.xml\n581 URLs` -- the catalog had moved to **577** tiles / **603**
  sitemap URLs.

The prose beside each node was correct (the file-tree said 30 modules, the prose
said 577 tiles / 603 URLs); only the diagram nodes drifted, and they had been
stale across roughly twenty spec landings. That is exactly the "a doc claim no
gate enforces" class, here in visual form.

## 2. The fix

Corrected the three stale Mermaid nodes (28 -> 30 modules; 555 -> 577 tile
shells; 581 -> 603 sitemap URLs). The Phase F node (`390 tests / 66 monotonicity
batches`) was checked and is current.

## 3. The gate

`scripts/check-readme-counts.mjs` (wired into the `npm run lint` chain after
`check-discoverability`; deterministic, offline) derives the live counts the same
way the build does -- tiles from the `tools-data.js` registry, modules from the
`calc-*.js` glob, groups from the distinct `group:` letters, sitemap = tiles +
groups + 2 (home + changelog) -- and asserts every **label-anchored** count claim
in the README matches. It anchors on the stable label next to each number, not the
number's position, so it catches drift whether the number lives in prose or a
Mermaid node:

- `<N> static shells` under the `/tools/` node -> tile count; under the `/groups/`
  node -> group count.
- `shell per tile (<N>)` -> tile count.
- `<N> group modules` and `<N> per-group calculator modules` -> module count.
- `sitemap.xml\n<N> URLs` and `carries <N> URLs` -> sitemap URL count.

It is negative-tested: re-introducing any of the three stale numbers (or any other
drift in these counts) reddens it. The lint chain is now 26 gates.

The gate deliberately does not blanket-check every occurrence of the bare catalog
number (e.g. `577`), because that number legitimately appears in historical "576
-> 577" stanzas; anchoring on the descriptive label is what makes the check robust.

## 4. As-landed verification

`npm run check:readme-counts` passes (7 label-anchored counts match: 577 tiles, 30
modules, 24 groups, 603 sitemap URLs). `npm run lint` (now 26 gates), `npm test`
(5,514, unchanged), and `npm run data:verify` remain green. README: the lint-chain
count updated (25 -> 26) and a `check-readme-counts` row added to the gate table.

## 5. Roadmap position

v49 closes the visual-doc-drift branch of the claim-audit ladder (doc-claim ->
dormant gate -> security invariant -> diagram drift). The catalog's headline
numbers are now build-enforced wherever they carry a descriptive label. A residual
known-but-low-risk item: the `SCH40_ID_IN` Schedule-40 pipe-ID table is duplicated
between `calc-plumbing.js` and `calc-gas.js` (a deliberate v42 split decision for a
fixed physical-standard table); its drift risk is near zero, so it is left as-is
rather than gated.
