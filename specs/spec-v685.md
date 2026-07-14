# roughlogic.com Specification v685 -- Baseboard Length for a Room Load (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-hvac.js`** (Group C,
> HVAC), no new module, group, or dependency. Inherits spec.md through spec-v684.md.
>
> **The gap, and the evidence for it.** Spec-v143 (`baseboard-output`) runs the hydronic baseboard relation forward:
> given a length, it returns the heat output. The room-by-room sizing move a heating tech makes is the inverse -- **how
> many feet of fin-tube baseboard does this room's heat load need**. The forward tile makes you guess lengths and re-read
> the output against the load; the inverse solves it directly. From `btu_total = btu_per_ft(water_temp) x length x
> flow_factor`, `length = target_load / (btu_per_ft x flow_factor)`, reusing the same manufacturer-table interpolation.
> The number this settles: a 4,800 BTU/hr room on 180 F water needs **8 ft** of Slant/Fin Fine Line 30; raise the supply
> to 200 F and it drops to **7 ft** -- hotter water shortens the run, the main lever when a wall is too short for the
> load.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`baseboard-output` sibling: it reuses the sibling's `BASEBOARD_OUTPUT` model table, water-temperature interpolation, and
flow correction (by calling `computeBaseboardOutput` at a 1 ft length), the target load is `M L^2 T^-3` (BTU/hr), the
water temperature is `T`, the flow is `L^3 T^-1`, and the returned length is `L` (ft). The v18/v21 contract: any
non-finite input, a non-positive target load, a non-positive water temperature, or an unknown model returns `{ error }`
(the latter two propagate from the forward). Citation discipline (v19/v22): the manufacturer BTU/ft table solved for
length, `GOVERNANCE.mechanical` matching the sibling; the note states that **hotter water shortens the run, this is the
active fin-tube length (add for the inactive ends, and the water cools along a long run so the far end puts out less --
split into loops or upsize for a big load), and the manufacturer rating at the design water temperature and the room
heat loss govern**.

## 2. The tile

### 2.1 `baseboard-length-for-load` -- Baseboard Length for a Room Load

```
inputs:
  target_btuhr   BTU/hr   room heat load (> 0)
  water_temp_F   F        average water temperature (> 0)
  flow_gpm       gpm      flow (default 1)
  model          -        baseboard model (table key)

btu_per_ft = interp(BASEBOARD_OUTPUT[model], water_temp_F)   (manufacturer table)
length_ft = target_btuhr / (btu_per_ft x flow_factor)        [ft]
```

**Pinned worked example (a small room).** target = 4,800 BTU/hr, 180 F water, 1 gpm, Fine Line 30 (600 BTU/ft, flow
factor 1.0): `length = 4800 / (600 x 1.0) = ` **8.0 ft**; feeding 8 ft back through `baseboard-output` returns 4,800
BTU/hr, the input. **Cross-check (hotter water).** Same load at 200 F (690 BTU/ft): `length = 4800 / 690 = ` **7.0 ft**
-- the hotter water raises the output per foot, so the same load needs less baseboard.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac"]`, beside `baseboard-output`; Group C has no exact-count audit block,
so no count bump -- only a citation entry is required, which this adds); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (manufacturer table solved for length, `GOVERNANCE.mechanical` matching the sibling, the note per
§1); `test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js`
(`baseboard-length-for-load` -> `computeBaseboardLengthForLoad` in `../../calc-hvac.js`); `scripts/related-tiles.mjs`
(-> `baseboard-output` / `manual-j-heating` / `balance-point` / `boiler-pipe-sizing`, and the forward tile links back);
`data/search/aliases.json` ("baseboard length for a target load", "feet of fin tube to size a room", "size baseboard
from btu load", plus adjacent rows distinct from the forward's); the calc-hvac RENDERERS map entry
`"baseboard-length-for-load": renderBaseboardLengthForLoad` via a hand-written renderer with the same model `makeSelect`
as the sibling (the select feeds the compute, satisfying check-dead-inputs) and the id added to the calc-hvac declare
list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index +
citation-strings; a `bounds-fuzzer.test.js` block pinning both examples, the hotter-water-shorter check, the round-trip
through `computeBaseboardOutput`, and the error seams. It shares the in-code `BASEBOARD_OUTPUT` table, so no data-shard
wiring is needed. The calc-hvac.js gzip cap and the HVAC group-shell cap are expected to hold (verify at build,
including `check-shells`). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `node scripts/check-shells.mjs` and
`check-shell-mobile.mjs` (the CI-only shell gates); `npm run data:verify`; worked-examples runner; 320 px audit; render +
output read to the value (the pinned example -> 8 ft for a 4,800 BTU/hr load at 180 F).

## 5. Roadmap position

Pairs the forward baseboard tile (`baseboard-output`, output from length) with its inverse (length from a target load),
the two halves of the hydronic room-sizing question. Further Group C growth stays evidence-driven.
