# roughlogic.com Specification v224 -- Roof Rain Load and Ponding Head (ASCE 7 Ch. 8) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-06-30). Batch spec-v224..v226 (the ASCE 7 structural design-loads trio that completes the
> roof and lateral load picture the catalog started with `wind-pressure` and `snow-load`: the rain/ponding load, the
> load-combination governing case, and the seismic base shear). This spec opens the batch.**
> In-scope catalog expansion under the spec-v106 trades-only charter: the rain load and the secondary-drainage head are
> a roofer's and a plumber's design check on every low-slope roof. Adds one tile to **`calc-construction.js`** (Group E);
> no new module, group, or dependency. Inherits spec.md through spec-v223.md.
>
> **The gap, and the evidence for it.** The catalog carries snow (`snow-load`) and wind (`wind-pressure`) on the roof,
> but not the load that actually collapses flat roofs: standing water. When the primary drains clog, water rises to the
> secondary (overflow) drain or scupper and stacks there, and ASCE 7 Ch. 8 puts a number on it -- the rain load is the
> weight of water at the depth of the secondary inlet plus the hydraulic head the secondary system needs to pass the
> design storm, at 5.2 psf per inch of depth. A roof that is flat or near-flat must be checked for that load and for
> ponding instability, and the secondary drainage has to be sized for the design rainfall. The catalog can weigh the
> snow on a roof but cannot tell a roofer or a plumber the rain load the blocked-drain case puts on it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The static head and the
hydraulic head are a length (`L`, in); the rain load is a pressure (`M L^-1 T^-2`, psf); the tributary roof area is an
area (`L^2`, ft^2); the design rainfall intensity is a length per time (`L T^-1`, in/hr); the design flow to the
secondary drainage is a volumetric flow (`L^3 T^-1`, gpm). The 5.2 psf/in is the unit weight of water per inch of depth
(62.4 pcf / 12) and the 0.0104 gpm per ft^2-in/hr is the roof-drainage flow constant, both carried as named constants.
The v18/v21 contract: any non-finite input, a negative static or hydraulic head, or (when supplied) a non-positive roof
area or rainfall, returns `{ error }` -- a zero total head is allowed and simply reports a zero rain load. Citation
discipline (v19/v22): `GOVERNANCE.general` over the rain-load and flow relations by name; `editionNote` names
**ASCE 7 Ch. 8** (`R = 5.2 * (ds + dh)`, the static head `ds` to the secondary inlet and the hydraulic head `dh` above
it at design flow) and the **IPC roof-drainage design flow** (`Q = 0.0104 * A * i`), and states that **the hydraulic
head `dh` comes from the secondary drain or scupper's flow capacity at the design flow (a manufacturer or weir relation
this tile takes as an input, not a bundled chart), the design rainfall is the 100-year hourly intensity for the site,
a roof too flexible to shed the water must also pass the ASCE 7 §8.4 ponding-instability check, and this is a load and
flow aid, not a stamped roof-drainage design** -- a screening number, not the engineer's secondary-drainage report.

## 2. The tile

### 2.1 `rain-load-ponding` -- Roof Rain Load and Secondary-Drainage Flow

```
inputs:
  static_head_in     L        depth of water to the secondary (overflow) drain/scupper inlet, ds, in
  hydraulic_head_in  L        additional head above the secondary inlet at design flow, dh, in
  roof_area_ft2      L^2      tributary roof area to the drain (optional, for the flow), ft^2 (default 0 = skip)
  rainfall_in_hr     L T^-1   design rainfall intensity, in/hr (optional, with the area; default 0 = skip)

rain_load_psf = 5.2 * (static_head_in + hydraulic_head_in)
design_flow_gpm = roof_area_ft2 > 0 && rainfall_in_hr > 0
                    ? 0.0104 * roof_area_ft2 * rainfall_in_hr
                    : null
```

**Pinned worked example (typical secondary scupper).** A secondary scupper set 2 in above the roof membrane (`ds = 2`),
passing the design storm at 1 in of head (`dh = 1`), draining a 2,000 ft^2 roof in a 3 in/hr design rainfall:
`rain_load = 5.2 * (2 + 1) = 5.2 * 3 = 15.6 psf`; `design_flow = 0.0104 * 2,000 * 3 = ` **62.4 gpm to the secondary**,
at a **15.6 psf** rain load. **Cross-check (deep static head, blocked primary).** A roof where the secondary inlet sits
4 in up (a high parapet scupper) and the design flow needs 2 in of head: `rain_load = 5.2 * (4 + 2) = 5.2 * 6 = ` **31.2
psf**. Doubling the head to the overflow doubles the rain load -- which is why the height of the secondary inlet above the
roof is a structural decision, not just a plumbing one, and why a flat roof's design has to assume the primary drains are
blocked.

## 3. Wiring

A `tools-data.js` row (group `E`, trade `["roofing","construction"]`); a `tile-meta.js` `_TILES` entry; a `citations.js`
entry (`GOVERNANCE.general`, the rain-load and flow relations, `editionNote` naming ASCE 7 Ch. 8 and the IPC drainage
flow with the dh-from-secondary / design-rainfall / ponding-instability / not-a-design caveats);
`test/fixtures/worked-examples.json` (the typical-scupper example + the deep-head cross-check);
`test/fixtures/compute-map.js` (`rain-load-ponding` -> `computeRainLoadPonding` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `snow-load` / `roof-drain-sizing` / `gutter-downspout`); `data/search/aliases.json`
("rain load", "ponding", "roof drainage load", "secondary drain", "overflow scupper", "asce 7 rain", "flat roof rain
load", "blocked drain load"); the id appended to the existing construction renderers declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples and error seams
(non-finite, negative head, the area-without-rainfall skip path). Raise the `calc-construction.js` size cap if needed
(dated comment). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the no-flow path); `npm run build` (one new shell, regenerated sitemap);
`npm run data:verify`; worked-examples runner; 320 px audit (the rain-load / design-flow stack wraps on a phone);
render-no-nan + a11y sweep, output read to the value (2 in + 1 in -> 15.6 psf).

## 5. Roadmap position

Opens the ASCE 7 structural design-loads batch (v224..v226). Joins `snow-load` and `wind-pressure` as the third roof
load, and feeds the `asce7-load-combinations` (v225) rain term. A scupper-weir hydraulic-head sub-mode (computing `dh`
from the scupper width and the design flow) and the §8.4 ponding-stiffness check are deliberate future follow-ons.
