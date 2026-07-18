# roughlogic.com Specification v917 -- Reaming Prebore (Drill) Allowance (calc-machining.js, Group K, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-machining.js`** (Group K),
> no new module, group, or dependency. Inherits spec.md through spec-v916.md. Machinist hole-making sweep, beside the
> accepted `tap-drill-size` and `drill-point-depth` tiles.
>
> **The gap, and the evidence for it.** The catalog sizes a tap drill and a drill point but nothing sizes the **prebore
> for a reamer**. Grep confirmed no reaming tile. Every reamed hole starts one drill under, and the stock left changes
> whether the reamer cleans up or tears. The number this settles: a 1/2 in machine reamer wants a **0.485 in** prebore
> (0.015 in of stock on the diameter).

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling
hole-making tiles: the reamer diameter, allowance, and prebore all carry `L`. The v18/v21 contract: a non-finite or
non-positive reamer diameter, a negative override, or an allowance exceeding the diameter (non-positive prebore) returns
`{ error }`. Citation discipline (v19/v22): the machine-reaming stock allowance by name (drill = reamer diameter -
allowance; diameter-band allowances ~0.010/0.015/0.020/0.025/0.030 in), `GOVERNANCE.general`; the note states that too
little stock burnishes and dulls the reamer while too much leaves an oversize, torn, or bell-mouthed hole, that the
machinist should select the nearest available drill at or just below the computed size, and that hand reamers, thin-wall
parts, and interrupted holes take less -- the reamer manufacturer's guidance and the material govern.

## 2. The tile

### 2.1 `reaming-drill-allowance` -- Reaming Prebore (Drill) Allowance

```
inputs:
  reamer_diameter_in     finished reamer diameter (in)
  allowance_override_in  manual allowance (in, 0 = use the diameter band)

allowance = override if > 0, else band(reamer_diameter_in):
            < 1/4 -> 0.010; 1/4-1/2 -> 0.015; 1/2-1 -> 0.020; 1-1.5 -> 0.025; 1.5-2 -> 0.030 (in, on diameter)
drill_diameter_in = reamer_diameter_in - allowance   [error if <= 0]
```

**Pinned worked example.** 0.500 in reamer, auto band:
`allowance = 0.015` (the 1/4 to 1/2 in band); `drill = 0.500 - 0.015 = ` **0.485 in** (a 31/64 drill). Cross-check: a
0.750 in reamer falls in the 1/2 to 1 in band (0.020), so `drill = 0.750 - 0.020 = ` **0.730 in** -- the allowance grows
with the diameter, and an override wins over the band for a tight or interrupted hole.

## 3. Wiring

A `tools-data.js` row (group `K`, trades `["machining", "mechanic"]`, beside `grinding-wheel-rpm`); a `tile-meta.js`
`_TILES` entry (`K`); a `citations.js` entry (machine-reaming allowance, Machinery's Handbook, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the 1/2 in example plus the 3/4 in cross-check, pinning the allowance and prebore);
`test/fixtures/compute-map.js` (`reaming-drill-allowance` -> `computeReamingDrillAllowance`, module
`../../calc-machining.js`); `scripts/related-tiles.mjs` (-> `tap-drill-size` / `drill-point-depth` / `cutting-speed-rpm`);
`data/search/aliases.json` (5 collision-checked aliases: "reaming allowance", "reamer drill size", "prebore for reamer",
"reaming stock", "drill before reaming"), then `node scripts/build-alias-shards.mjs`; a hand-written renderer in the
`MACHINING_RENDERERS` map (non-exported, so no DOM-sentinel dims row), and the id added to the calc-machining declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning the banded allowances across the bands, the override, and the
error seams (non-positive reamer, negative override, allowance exceeding the diameter, non-finite). The calc-machining.js
gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded,
absent from home first paint. Home tile count 1,365 -> 1,366.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.500 - 0.015 -> 0.485 in prebore).

## 5. Roadmap position

Machinist hole-making tile beside `tap-drill-size`, serving the machinist / mechanic (machining / mechanic). Deliberately
public-domain guidance; the reamer manufacturer and the material govern the finished hole. Stays evidence-driven.
Continues the machinist setup sweep at 1 new spec (v917).
