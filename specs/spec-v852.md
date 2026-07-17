# roughlogic.com Specification v852 -- Cable-Pulling Lubricant Quantity (calc-electrical.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group A),
> no new module, group, or dependency. Inherits spec.md through spec-v851.md. Electrical install-ops sweep, beside
> `pulling-tension` and `cable-reel-capacity`.
>
> **The gap, and the evidence for it.** `pulling-tension` tells the crew how hard the pull is but nothing estimates the
> **lubricant** it takes, and running short mid-pull means a stuck cable. Grep confirmed no lubricant tile. The film-
> coating rule of thumb (about 0.0015 gallon per foot per square inch of conduit) is public. The number this settles: a
> 400 ft run in 3 in conduit wants about **5.4 gallons** (round to a full pail), and a bend-heavy, high-fill pull pushes
> that past 7.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group A
electrical siblings (`pulling-tension`, `conduit-fill`): the run length and conduit inside diameter carry `L`, the K and
bend factors are dimensionless coefficients, and the gallons carry `L^3`. The v18/v21 contract: a non-finite or
non-positive length, conduit ID, K factor, or bend factor returns `{ error }`. Citation discipline (v19/v22): the film-
coating estimate by name (gallons = K x length x conduit ID squared x bend factor), `GOVERNANCE.general`; the note states
that K is a film-coating rule from the lubricant manufacturer (about 0.0015 for the common Polywater rule), that more
bends and higher conduit fill raise the demand through the bend factor, that under-lubing risks a stuck pull, and that the
crew rounds up and keeps a spare pail.

## 2. The tile

### 2.1 `wire-pulling-lubricant` -- Cable-Pulling Lubricant Quantity

```
inputs:
  length_ft     conduit run length (ft)
  conduit_id_in conduit inside diameter (in)
  k_factor      film-coating factor (dimensionless, default 0.0015)
  bend_factor   bend / fill multiplier (dimensionless, default 1.0)

gallons = k_factor * length_ft * conduit_id_in^2 * bend_factor
```

**Pinned worked example.** Length 400 ft, conduit ID 3 in, K 0.0015, bend factor 1.0:
`gallons = 0.0015 * 400 * 9 * 1.0 = ` **5.4 gal** (round to a 5-gallon pail plus a spare). Cross-check: three sweeps and a
high fill at a 1.3 bend factor gives `0.0015 * 400 * 9 * 1.3 = ` **7.0 gal** -- the bends, not the length alone, decide
whether one pail does it.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical", "low-voltage"]`, inside the `// Group A` electrical block near
`pulling-tension`) -- the Group A citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`A`); a
`citations.js` entry (gallons = K x length x conduit ID^2 x bend factor, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the bend-heavy cross-check); `test/fixtures/compute-map.js`
(`wire-pulling-lubricant` -> `computeWirePullingLubricant`, module `../../calc-electrical.js`); `scripts/related-tiles.mjs`
(-> `pulling-tension` / `cable-reel-capacity` / `conduit-fill`); `data/search/aliases.json` (5 collision-checked aliases:
"cable pulling lubricant", "wire pulling lube", "conduit lube quantity", "pulling compound gallons", "wire lube
estimate"); a hand-written renderer in the `ELECTRICAL_RENDERERS` map mirroring a simple output renderer (non-exported, so
no DOM-sentinel dims row), and the id added to the calc-electrical declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning
the gallons and the error seams (non-positive length, conduit ID, K, bend factor). The calc-electrical.js gzip cap is
watched at build (near its cap). Verify at build, including `check-shells` and `check-module-sizes` post-build.
Lazy-loaded, absent from home first paint. Home tile count 1,300 -> 1,301.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group A audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build
(watch calc-electrical.js -- near cap); `npm run data:verify`; worked-examples runner; 320 px audit; render + output read
to the value (0.0015 * 400 * 9 -> 5.4 gal).

## 5. Roadmap position

Electrical install-ops tile beside `pulling-tension` (the force) and `cable-reel-capacity` (the reel), serving the
electrician (electrical / low-voltage). Stays evidence-driven; the lubricant manufacturer's rate governs.
