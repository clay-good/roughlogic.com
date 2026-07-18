# roughlogic.com Specification v931 -- Joist / Deck Cantilever Ratio Check (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group
> E), no new module, group, or dependency. Inherits spec.md through spec-v930.md. Light-frame field-check sweep, beside
> the accepted `joist-notch-bore-limit` and `deck-beam-post` tiles.
>
> **The gap, and the evidence for it.** The catalog has an engineering `cantilever-beam` moment/deflection tile but not
> the prescriptive 1:4 deck/floor cantilever RATIO check. Grep confirmed no ratio tile. Every deck framer sizes the
> overhang off the backspan. The number this settles: a 10 ft backspan allows a **2.5 ft** cantilever per IRC R507.6.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, beside the sibling framing
tiles: the backspan, overhang, max cantilever, and margin carry `L`, and the verdict is dimensionless. The v18/v21
contract: a non-finite or non-positive backspan, or a negative overhang, returns `{ error }`. Citation discipline
(v19/v22): the 1:4 cantilever ratio by name (max = backspan / 4; within when overhang <= max), `GOVERNANCE.general`; the
note states that the rule is IRC R507.6 for decks and R502.3.3 for floors, that the prescriptive tables also cap the
absolute overhang and require an uplift check at the backspan support, and that a beam, wall, or roof bearing on the
cantilever tip is an ENGINEERED condition, not prescriptive -- the span tables and the AHJ-adopted code govern.

## 2. The tile

### 2.1 `joist-cantilever-check` -- Joist / Deck Cantilever Ratio Check (IRC R507.6)

```
inputs:
  backspan_ft   span from the cantilever support back to the next support (ft)
  overhang_ft   cantilever / overhang length (ft)

cantilever_max_ft = backspan_ft / 4
within_limit      = overhang_ft <= cantilever_max_ft
margin_ft         = cantilever_max_ft - overhang_ft
```

**Pinned worked example.** 10 ft backspan, 3 ft overhang:
`max = 10 / 4 = ` **2.5 ft**; 3 ft > 2.5 ft, so **EXCEEDS** (margin -0.5 ft) -- the backspan must grow to 12 ft to carry a
3 ft overhang. Cross-check: a 12 ft backspan with a 2 ft overhang is `12 / 4 = ` **3.0 ft** max, so 2 ft is **WITHIN
LIMIT** (margin +1.0 ft) -- the allowable overhang tracks the backspan one-for-four.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry"]`, beside `joist-notch-bore-limit`); a `tile-meta.js` `_TILES`
entry (`E`); a `citations.js` entry (1:4 cantilever ratio, IRC R507.6, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the exceeds example plus the within-limit cross-check, pinning the max cantilever
and margin); `test/fixtures/compute-map.js` (`joist-cantilever-check` -> `computeJoistCantileverCheck`, module
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `deck-beam-post` / `cantilever-beam` / `joist-hanger-count`);
`data/search/aliases.json` (5 collision-checked aliases: "cantilever ratio", "joist cantilever", "deck cantilever", "how
far can a joist overhang", "backspan cantilever rule"), then `node scripts/build-alias-shards.mjs`; a `_simpleRenderer`
in the `CONSTRUCTION_RENDERERS` map leading with the WITHIN / EXCEEDS verdict (non-exported, so no DOM-sentinel dims row),
and the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the 1:4 max, the verdict
both directions, the margin, and the error seams (non-positive backspan, negative overhang, non-finite). The
calc-construction.js gzip cap and the Group E group shell are watched at build. Verify at build, including `check-shells`
and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count 1,379 -> 1,380.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(10 / 4 -> 2.5 ft max, a 3 ft overhang EXCEEDS).

## 5. Roadmap position

Light-frame field-check beside `joist-notch-bore-limit`, serving the deck / floor framer (carpentry). Deliberately a
prescriptive ratio screen; the span tables, the tip load, the uplift connection, and the AHJ-adopted code govern. Stays
evidence-driven. Continues the light-frame field-check sweep at 1 new spec (v931).
