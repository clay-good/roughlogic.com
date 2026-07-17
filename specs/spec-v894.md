# roughlogic.com Specification v894 -- Pipe Inert Purge Volume and Time (calc-plumbing.js, Group B, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-plumbing.js`** (Group B),
> no new module, group, or dependency. Inherits spec.md through spec-v893.md. Pipefitting install-ops sweep, beside
> `pipe-volume` and `nitrogen-pressure-test`.
>
> **The gap, and the evidence for it.** Nothing gives the **inert purge** for a pipe run -- the volume and time to sweep
> it with nitrogen while brazing (or to purge a medical-gas or process line). Grep confirmed no pipe-purge tile
> (`confined-space-purge` is a room). The number this settles: 100 ft of 2 in pipe holds 2.33 ft^3, so five volume changes
> is **11.65 ft^3** and, at 60 scfh, about **12 minutes** of purge before the joint is brazed.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group B pipe
siblings (`pipe-volume`, `nitrogen-pressure-test`): the pipe ID and length carry `L`, the air changes is dimensionless,
the flow is a volume-rate `L^3 T^-1`, the pipe and purge volumes are `L^3`, and the purge time is `T`. The v18/v21
contract: a non-finite or non-positive pipe ID, length, air changes, or flow returns `{ error }`. Citation discipline
(v19/v22): the purge identity by name (pipe volume = pi/4 x ID^2 x length; purge volume = pipe volume x air changes; time
= purge volume / flow), `GOVERNANCE.general`; the note states that a nitrogen purge while brazing keeps scale and
oxidation out of the line, that the number of volume changes (about five to seven to reach a low oxygen level) and the
acceptable oxygen or dew point come from the spec or manufacturer, that a flow or oxygen meter confirms the endpoint (this
estimates the time), and that it is distinct from the room `confined-space-purge`.

## 2. The tile

### 2.1 `pipe-purge-volume` -- Pipe Inert Purge Volume and Time

```
inputs:
  pipe_id_in   pipe inside diameter (in)
  length_ft    run length (ft)
  air_changes  volume changes to sweep (dimensionless, default 5)
  flow_scfh    purge gas flow (scfh, default 60)

pipe_volume_ft3  = (PI/4) * (pipe_id_in/12)^2 * length_ft
purge_volume_ft3 = pipe_volume_ft3 * air_changes
purge_min        = purge_volume_ft3 / flow_scfh * 60
```

**Pinned worked example.** Pipe ID 2.067 in (2 in Type L), length 100 ft, 5 changes, 60 scfh:
`pipe volume = (PI/4)*(2.067/12)^2*100 = ` **2.33 ft^3**; `purge = 2.33*5 = ` **11.65 ft^3**;
`time = 11.65/60*60 = ` **11.65 min**. Cross-check: a 4 in line (ID 4.026 in) holds `8.84 ft^3`, so `44.2 ft^3` over five
changes is **44 min** at the same flow -- the diameter squared drives both the volume and the time.

## 3. Wiring

A `tools-data.js` row (group `B`, trades `["pipefitting", "hvac"]`, inside the `// Group B` plumbing block near
`pipe-volume`) -- the Group B citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`B`); a
`citations.js` entry (purge volume = pipe volume x air changes; time = purge / flow, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-line cross-check); `test/fixtures/compute-map.js`
(`pipe-purge-volume` -> `computePipePurgeVolume`, module `../../calc-plumbing.js`); `scripts/related-tiles.mjs`
(-> `pipe-volume` / `nitrogen-pressure-test` / `confined-space-purge`); `data/search/aliases.json` (5 collision-checked
aliases: "pipe purge volume", "nitrogen purge time", "brazing purge", "pipe inert purge", "purge gas volume"); a
hand-written renderer in the `PLUMBING_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel
dims row), and the id added to the calc-plumbing declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the pipe and
purge volumes, the purge time, and the error seams (non-positive ID, length, air changes, flow). The calc-plumbing.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,342 -> 1,343.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group B audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((PI/4)*(2.067/12)^2*100*5/60*60 -> 11.65 min).

## 5. Roadmap position

Pipefitting install-ops tile beside `pipe-volume` and `nitrogen-pressure-test`, serving the pipefitter / HVAC tech
(pipefitting / hvac). Distinct from the room `confined-space-purge`. Stays evidence-driven; the spec sets the endpoint.
