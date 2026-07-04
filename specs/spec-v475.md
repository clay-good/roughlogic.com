# roughlogic.com Specification v475 -- Remove the offline/PWA + MCP home-note from index.html (index.html, 0 New Tiles)

> **Status: LANDED (2026-07-04). A UI copy removal, not a tile. Removes the `.home-note` paragraph under the home lede that
> advertised the offline/PWA capability and the local MCP server. The maintainer removed this blurb intentionally (commit
> 41d5729); it was later restored by mistake (commit 1d19ba7) while chasing an apparent regression. This spec records the
> deliberate decision so the removal has a paper trail and is not "restored" again.**
> The blurb read, verbatim:
> *"Works offline. Save the page or install it as an app (PWA) and every calculator keeps running with the network off. The
> whole catalog is also a local MCP server, so AI agents can search and run these deterministic tools on your machine."*
> It was added in commit 8fdb84f (feat(home): surface offline/PWA + MCP server on the home page) directly in `index.html`,
> never governed by a spec. The offline/PWA and MCP-server capabilities themselves are unchanged and remain documented in the
> README and the MCP docs; only the home-page callout is removed. Inherits spec.md through spec-v474.md.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. What changes

Remove the `<p class="home-note">...</p>` element from `index.html` (the paragraph immediately under the `.home-lede`
paragraph). No compute, no tile, no registry, no catalog count changes -- this is home-page copy only. The `.home-note` and
`.home-note abbr` rules in `styles.css` are left in place as an inert, harmless style block (removing them is optional and
out of scope; they lint clean and cost a handful of bytes).

## 2. Wiring

A single edit to `index.html` deleting the five-line `.home-note` paragraph. No `tools-data.js`, `tile-meta.js`,
`citations.js`, `compute-map.js`, `related-tiles.mjs`, `aliases.json`, `worked-examples.json`, `app.js`, or
`bounds-fuzzer.test.js` change; no version bump required for a copy removal (bundled with the campaign-close state at
0.162.0). The catalog tile count (929), group count (21), and sitemap URL count (951) are unchanged.

## 3. As-landed verification (gate plan)

Standard green bar for a non-tile change: `npm run build` (regenerates `dist/`), `node scripts/check-dist.mjs` (the
`.home-note`-free `index.html` still resolves every same-origin reference), `npm run check:shell-mobile` (the home shell has
no horizontal scroll at 320 px without the paragraph), and `npm run lint` (all gates, including `check-readme-counts`, still
green -- no count anchored to the home-note). A quick `grep -c 'home-note' index.html` returns 0 after the edit.

## 4. Note

The `.home-note` copy is ungated (no check verifies its presence or absence), which is why it was silently removed once and
silently restored once. This spec is the record of intent: the home-page callout stays removed. If the callout is ever
wanted back, revive it from commit 8fdb84f and supersede this spec.
