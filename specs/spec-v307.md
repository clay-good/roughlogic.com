# roughlogic.com Specification v307 -- Pump Specific Speed and Impeller Type (calc-hvac.js, Group C, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v305..v307 (the pump-and-fluid fundamentals trio -- Reynolds
> number (v305), hydronic flow (v306), pump specific speed (this spec)).**
> In-scope catalog expansion under the spec-v106 trades-only charter: the catalog sizes pump head and operating point
> (`pump-tdh`, `pump-operating-point`) but has no tile for specific speed -- the dimensionless index that says whether a duty
> wants a radial, mixed-flow, or axial impeller, and predicts the shape of the pump's efficiency and NPSH behavior. Adds one
> tile to the existing **`calc-hvac.js`** module (Group C); no new group, trade, or dependency. Inherits spec.md through
> spec-v306.md.
>
> **The gap, and the evidence for it.** The pump specific speed `Ns = N sqrt(Q) / H^(3/4)` (US units: `N` rpm, `Q` gpm at
> best efficiency, `H` ft per stage) classifies the impeller geometry a duty calls for: roughly `Ns < 2,000` radial (high
> head, low flow), `2,000 to 4,500` mixed flow, and `> 4,500` axial (low head, high flow). For an 1,800 rpm pump (about
> 1,750 rpm at slip) delivering 500 gpm at 100 ft, `Ns = 1,750 sqrt(500) / 100^0.75 = 1,237` -- a radial-vane centrifugal,
> the common building-service pump. Take the same speed and flow down to 25 ft of head and `Ns = 3,500`, a mixed-flow
> machine: the head-to-flow ratio, not the size, sets the wheel type. `pump-tdh` gives the duty; this tile reads what kind
> of pump fits it.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The pump speed `N` is a
rotational speed (rpm); the flow `Q` is a volumetric flow (gpm at the best-efficiency point); the head `H` is a length (ft
per stage); the specific speed `Ns` is reported as the customary US dimensionless-in-practice index; the impeller class is a
categorical label. The v18/v21 contract: any non-finite input, or a speed, flow, or head at or below zero, returns
`{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the pump-specific-speed definition by name;
`editionNote` names **the US specific speed `Ns = N sqrt(Q) / H^(3/4)` (rpm, gpm, ft/stage, at BEP), and the customary
impeller-type bands (radial below ~2,000, mixed ~2,000 to 4,500, axial above ~4,500) as compiled in the Hydraulic Institute
and pump-handbook references**, and states that **this returns the US-unit specific speed and the indicative impeller class
-- it uses the flow and head at the best-efficiency point per stage (divide total head by the number of stages), is the
customary dimensional US form (not the dimensionless or metric `nq`), and does not compute the suction specific speed `Nss`
(a separate NPSH-margin index) or select a specific pump; and this is an engineering aid** -- the pump manufacturer's curves
govern.

## 2. The tile

### 2.1 `pump-specific-speed` -- Pump Specific Speed and Impeller Type

```
inputs:
  N_rpm    rpm    pump rotational speed
  Q_gpm    gpm    flow at best-efficiency point
  H_ft     ft     head per stage (total head / stages)

Ns = N_rpm * sqrt(Q_gpm) / H_ft^0.75
class = Ns < 2000 ? "radial" : Ns <= 4500 ? "mixed flow" : "axial"
```

**Pinned worked example (an 1,750 rpm pump, 500 gpm at 100 ft).** `N = 1,750`, `Q = 500`, `H = 100`:
`Ns = 1,750 x sqrt(500) / 100^0.75 = 1,750 x 22.36 / 31.62 = 1,237` -> **radial** (high-head, low-flow centrifugal, the
building-service norm). **Cross-check (a low-head, high-flow duty at 25 ft).** Same speed and flow, `H = 25`:
`Ns = 1,750 x 22.36 / 25^0.75 = 1,750 x 22.36 / 11.18 = 3,500` -> **mixed flow** -- lowering the head quadrupled `Ns` (the
`H^(3/4)` in the denominator), pushing the duty out of the radial family, the reason a big-flow low-head service wants a
different wheel. The non-finite and non-positive error paths bracket the result, and the class crosses at 2,000 and 4,500.

## 3. Wiring

A `tools-data.js` row (group `C`, trades `["hvac","plumbing"]`, matching the pump tiles); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the specific-speed definition, `editionNote` naming `Ns = N sqrt(Q)/H^(3/4)`,
the impeller bands, the per-stage-BEP basis, and the US-form, not-Nss, not-selection caveats);
`test/fixtures/worked-examples.json` (the radial example + the mixed-flow cross-check); `test/fixtures/compute-map.js`
(`pump-specific-speed` -> `computePumpSpecificSpeed` in `../../calc-hvac.js`); `scripts/related-tiles.mjs` (-> `pump-tdh` /
`pump-operating-point` / `affinity-laws` / `npsh-a`); `data/search/aliases.json` ("specific speed", "Ns pump", "impeller
type", "radial mixed axial", "pump selection specific speed", "N sqrt Q over H", "pump wheel type", "centrifugal specific
speed", "pump geometry"); the id appended to the existing hvac renderers block in `app.js`; the `// dims:` annotation (`N`
rotational speed, `Q` volumetric flow, `H` length, `Ns` dimensionless index); regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the `H^(3/4)` sensitivity, the 2,000/4,500 class boundaries, and the
non-positive / non-finite error seams. No new module; re-pin `calc-hvac.js` on the `check:module-sizes` allowlist.
Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the class-boundary assertions); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `Ns` / class pair wraps on a phone);
render-no-nan + a11y sweep, output read to the value (1,750 rpm, 500 gpm, 100 ft -> Ns 1,237 radial).

## 5. Roadmap position

Closes the pump-and-fluid fundamentals batch (v305..v307) in `calc-hvac.js`: Reynolds number, hydronic flow, and pump
specific speed now stand beside the friction, head, and operating-point tiles. The suction specific speed `Nss` and NPSH-
margin, the affinity-law scaling of `Ns`-family curves, and a metric `nq` toggle are the deliberate next follow-ons once the
trio lands.
