# roughlogic.com Specification v1188 -- Zero-Cost Agent Discoverability and Packaging (mcp/package.json, mcp/README.md, build -> dist/llms.txt, dist/.well-known, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, fifth and last of the "MCP full agent integration" series (v1184-v1188).**
> Spec-only session: no code lands with this file. No new tile, module, group, or dependency. Inherits spec.md
> through spec-v1187.md.
>
> **The constraint that shapes this spec: no hosting.** The publisher does not want to run a hosted MCP
> endpoint -- that would put the catalog's compute behind a server the publisher pays for and operates. The
> server stays a **local stdio process the agent runs itself** (mcp/server.mjs), and the only thing the site
> serves is static files, which Cloudflare Pages already hosts for free (wrangler.jsonc: `assets` from
> `./dist`, no Worker `main`). "Easy for agents to use" therefore means **easy to discover and install**, not
> hosted.
>
> **The gaps, and the evidence for them.** (1) `mcp/package.json` `files` lists only `server.mjs`,
> `catalog.mjs`, `README.md` -- but the server imports `../tools-data.js`, `../test/fixtures/compute-map.js`,
> `../test/fixtures/worked-examples.json`, `../data/search/aliases.json`, and `../search-discovery.js` (and,
> after v1184-v1185, the `calc-*.js` modules). So the README's promised `npx roughlogic-mcp` would install a
> package **missing every file it reads** and crash on first import. (2) The site offers agents no
> machine-readable pointer: no `/llms.txt`, no `/.well-known/` manifest, nothing that tells a crawling or
> browsing agent that a catalog and an MCP server exist or how to wire them.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Packaging and static-asset work only; the runtime server is unchanged. The static manifests are generated
into `dist/` by the existing build (the same pipeline that emits the shards and the shells), so they ship as
ordinary Cloudflare Pages assets under the current `_headers` policy -- no Worker, no route, no compute, no
recurring cost.

## 2. Make the published package actually run (mcp/package.json)

The package must be self-contained. Either vendor the data the server reads into `mcp/` at pack time (a
`prepack` step that copies `tools-data.js`, `compute-map.js`, `worked-examples.json`, `aliases.json`,
`search-discovery.js`, and the `calc-*.js` renderer/compute modules into `mcp/`, with the imports resolving
locally), or restructure so `mcp/` is the package root and the data is bundled beneath it. The `files` array
then lists exactly what ships. A `pack-and-run` smoke test in CI runs `npm pack`, installs the tarball into a
clean temp dir, and executes the README smoke test against the installed binary -- so a broken `files` list
fails the build instead of shipping.

## 3. Tell agents it exists (build -> dist/llms.txt, dist/.well-known)

Two static files, generated from the live catalog so their counts never drift:

- **`dist/llms.txt`** -- the emerging convention for an agent-readable site guide. Names the catalog, its size
  (the exact tile count, gated the way the home lede count is), the three MCP tools, the resource and prompt
  surfaces (v1186), and the one-line install (`claude mcp add roughlogic -- npx -y roughlogic-mcp`). Plain
  text, no secrets, no personal data.
- **`dist/.well-known/mcp.json`** -- a small manifest describing the server: name, version (the site
  version), transport (`stdio`), the install command, and the tool names. A machine pointer for clients that
  probe `.well-known`.

Both are read-only descriptions of the local server; neither hosts it. The site links `llms.txt` from the
existing footer or head so it is reachable, without changing the human-facing copy (home tab title and lede
stay as they are per the home-count and home-title conventions).

## 4. Scope

Discovery and install only. No hosted endpoint -- explicitly out of scope and against the publisher's stated
constraint. No new tile, no compute change, no new dependency. Registry submission (the npm publish and any
public MCP registry listing) is a release action noted here, not code: the spec makes the package publishable
and correct; the human runs the publish.

## 5. Wiring

Build gains two emit steps (`llms.txt`, `.well-known/mcp.json`) fed by the same catalog load the corpus and
tile-index use, with a counts assertion tying `llms.txt` to the live tile total (mirror `check-readme-counts`).
`mcp/package.json` gains the `prepack`/bundling step and the corrected `files` list; CI gains the
`pack-and-run` tarball smoke test. `mcp/README.md`'s `npx` instructions become true once the package is
self-contained. Tests: the pack-and-run test; a build test asserting `dist/llms.txt` exists and its stated
count equals the catalog total; and a manifest test asserting `dist/.well-known/mcp.json` parses and lists
the current tool set (`search_calculators`, `describe_calculator`, `run_calculator`, `run_calculators`).
