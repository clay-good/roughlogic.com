# roughlogic.com Specification v906 -- PEX Home-Run Manifold Port and Tubing Takeoff (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v905.md. Plumbing install-ops sweep, beside
> `pipe-sizing`.
>
> **The gap, and the evidence for it.** The catalog sizes pipe for flow but nothing takes off a **PEX home-run manifold**
> -- the ports and tubing for one line per fixture. Grep confirmed no PEX-manifold tile. The number this settles: 8
> fixtures with 6 hot needs a **14-port** manifold, and at a 35 ft average run that is about **539 LF** of PEX -- the
> manifold size and tubing order for a home-run rough-in.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group B
plumbing siblings (`pipe-sizing`, `wsfu-demand`): the average run carries `L`, the fixture and port counts are
dimensionless, the waste is dimensionless, and the tubing footage is `L`. The v18/v21 contract: a non-finite or
non-positive fixture count or average run returns `{ error }`; a negative hot-fixture count or waste, or hot fixtures
exceeding total fixtures, returns `{ error }`. Citation discipline (v19/v22): the takeoff identity by name (cold ports =
fixtures; hot ports = hot fixtures; tubing = (cold ports + hot ports) x average run x (1 + waste)),
`GOVERNANCE.general`; the note states that home-run (manifold) plumbing runs one line per fixture from a central
manifold, that the manifold is sized to the total ports plus spares, that the tubing footage uses the average home-run
length, and that this is a port count and footage distinct from the flow-sizing `pipe-sizing`.

## 2. The tile

### 2.1 `pex-homerun-takeoff` -- PEX Home-Run Manifold Port and Tubing Takeoff

```
inputs:
  fixtures      total fixtures (count)
  hot_fixtures  fixtures needing hot (count)
  avg_run_ft    average home-run length (ft)
  waste_pct     waste allowance (percent, default 10)

cold_ports  = fixtures
hot_ports   = hot_fixtures
total_ports = cold_ports + hot_ports
tubing_lf   = ceil(total_ports * avg_run_ft * (1 + waste_pct/100))
```

**Pinned worked example.** 8 fixtures, 6 hot, 35 ft average run, 10% waste:
`cold ports = 8`, `hot ports = 6`, `total = ` **14 ports**; `tubing = ceil(14*35*1.10) = ` **539 LF** (490 neat).
Cross-check: a larger house with 12 fixtures (10 hot) needs `12 + 10 = ` **22 ports** and `ceil(22*35*1.10) = ` **847 LF**
-- the fixture count drives both the manifold and the tubing.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["plumbing"]`, inside the `// Group B` plumbing block near `pipe-sizing`) -- the
Group B citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`B`); a `citations.js` entry (ports =
fixtures + hot fixtures; tubing = ports x avg run x (1 + waste), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-house cross-check); `test/fixtures/compute-map.js`
(`pex-homerun-takeoff` -> `computePexHomerunTakeoff`, module `../../calc-plumbing.js`); `scripts/related-tiles.mjs`
(-> `pipe-sizing` / `wsfu-demand` / `solder-joint-quantity`); `data/search/aliases.json` (5 collision-checked aliases:
"pex homerun takeoff", "pex manifold ports", "pex tubing footage", "home run plumbing", "manifold port count"); a
hand-written renderer in the `PLUMBING_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel
dims row), and the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the port counts,
tubing footage, and the error seams (non-positive fixtures or run; negative hot fixtures or waste; hot exceeding total).
The calc-plumbing.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,354 -> 1,355.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group B audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil((8+6)*35*1.10) -> 539 LF, 14 ports).

## 5. Roadmap position

Plumbing rough-in takeoff beside `pipe-sizing`, serving the plumber (plumbing). Stays evidence-driven; the fixture layout
governs the manifold.
