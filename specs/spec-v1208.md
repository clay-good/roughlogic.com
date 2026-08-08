# roughlogic.com Specification v1208 -- Design Flow from Population (Average, Peak, Minimum) (calc-treatment.js, Group M, 1 New Tile)

> **Status: PROPOSED (2026-08-08). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-treatment.js`** (Group M),
> no new module, group, or dependency. Inherits spec.md through spec-v1207.md.
>
> **The gap, and the evidence for it.** The design flow `flow_mgd` is a required input to roughly a dozen compute
> functions -- `computePoundsFormula`, `computePopulationEquivalent`, `computeRasFlowRate`, `computeWasSrtControl`,
> `computeIronManganeseChlorineDose`, `computeDechlorinationDose`, `computeFluorideFeedDose` (calc-water.js), and
> `computeClarifierSurfaceLoading`, `computeClarifierAreaForLoading`, `computeChemicalFeedPump`,
> `computeBodTssLoadingRemoval` (calc-treatment.js) -- but no tile produced it. The only population/flow tile,
> `population-equivalent`, runs the OTHER way (a flow into a population: `PE_flow = gpd / 100`). This is the same
> needed-input gap that spec-v1207 closed for `cv`.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a
non-positive or non-finite population or per-capita flow returns `{ error }`. Citation discipline (v19/v22): the Harmon
peaking factor and the Gifft minimum-flow ratio as compiled in Metcalf & Eddy (Wastewater Engineering) / Ten States
Standards, by name, `GOVERNANCE.water`. **No copyrighted table is reproduced** -- both empirical factors are closed-form,
and the per-capita flow is the user's own design basis.

## 2. The tile

### 2.1 `design-flow-peaking` -- Design Flow from Population (Average, Peak, Minimum)

```
P            = population / 1000                        population in thousands
Q_avg (gpd)  = population * per_capita_gpcd
Q_avg (MGD)  = Q_avg_gpd / 1e6                          the flow_mgd the rest of the bench consumes
Q_avg (gpm)  = Q_avg_gpd / 1440
PF (Harmon)  = 1 + 14 / (4 + sqrt(P))                   peak-to-average ratio
Q_peak       = Q_avg * PF                               sizes sewers, pumps, clarifier area
min ratio    = 0.2 * P^(1/6)                            Gifft minimum-to-average ratio
Q_min        = Q_avg * (0.2 * P^(1/6))                  governs self-cleansing velocity
```

**Inputs:** `population` (persons) and `per_capita_gpcd` (gpcd; default 100, roughly 60-100 domestic).

**Outputs:** average, peak, and minimum flow in MGD and gpm; the Harmon peak factor and the Gifft minimum ratio.

## 3. Worked example

`population = 50000, per_capita_gpcd = 100`:

```
Q_avg = 50000 * 100 / 1e6 = 5.0 MGD (3,472 gpm)
PF    = 1 + 14/(4 + sqrt(50)) = 1 + 14/11.0711 = 2.2645
Q_peak = 5.0 * 2.2645 = 11.32 MGD
min ratio = 0.2 * 50^(1/6) = 0.2 * 1.9193 = 0.3839
Q_min = 5.0 * 0.3839 = 1.92 MGD
```

The peak factor falls as the system grows: a 1,000,000-person system gives PF = 1 + 14/(4 + sqrt(1000)) = 1.39, because
demand diversity smooths the peak.

## 4. Limitations

Domestic sanitary flow only. The per-capita basis is the user's; infiltration/inflow and any industrial load are added
separately. The Harmon factor is drawn for populations of about 1,000 to 1,000,000 (a population below 1,000 is flagged).
A design aid; Ten States Standards, the state design criteria, and the engineer of record govern.

## 5. Verification

- Bounds-fuzzer `bounds: spec-v1208` pins the average/peak/min, the Harmon and Gifft factors, the linear scaling in
  population and per-capita flow, the decreasing peak factor with size, the min < avg < peak ordering, and the error
  seams.
- Two worked-example rows in `test/fixtures/worked-examples.json` (the 50,000-person example and the 1,000,000
  peak-factor cross-check).
- Formula checked against the standard Harmon/Gifft relations (Metcalf & Eddy / Ten States Standards).
