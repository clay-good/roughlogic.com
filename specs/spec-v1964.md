# spec-v1964.md -- Show the steps

> **Status: LANDED (2026-10-17). Platform spec, no tile added. Roadmap pillar 3 of [spec-v106](spec-v106.md) section 7, "worked-math transparency".** Catalog stays at **2,267**.

## What it does for you

Under the answer on **2,095 of the 2,267 calculators (92%)** there is now a collapsed **Show the steps** panel. Open it and you get the arithmetic behind the number. You see every input as the calculator actually used it, after defaults, and every intermediate value it worked out on the way to the answer. Each value has its label and unit. When an inspector asks how you got 106 in, the panel shows the steps without your redoing the math.

## What "the steps" means here

| Section | Contents | Source |
|---|---|---|
| Inputs used | each input's label and the value the compute received | the renderer's own field list |
| Worked values | every finite number the compute returned that is not an input echo | the compute's result object |

Left out on purpose:
- booleans and text (verdicts and notes are already printed above);
- non-finite values;
- any value whose key is too cryptic to caption honestly. `humanizeKey` returns null for keys like `x` or `r`, and a guessed label is worse than none.

Formulas with the numbers substituted in ("q = 0.00256 x 1.0 x ... = 25.4 psf") are **not** in this version. They need per-tile authoring. The citation line above each tile already prints its formula by name, so formula plus inputs plus intermediate values covers the inspector's question.

## Coverage, stated plainly

| Renderer kind | Tiles | Steps panel | How |
|---|---|---|---|
| Declarative (`_simpleRenderer`, 76 module copies) | 1,014 | yes | two lines per copy, fed the field list |
| Hand-written, one main compute call | 1,081 | yes | one `stepsFor` line after the call; inputs read off the page |
| Hand-written, no single main call | 172 | no | input-free references (`gfci-afci-reference`, `pressure-conversion`), pages that run several computes (`duct-sizing`), and Manual J, which computes in a worker |

The first landing (a4d1dd9a) covered the declarative tiles only. That landing counted 998 because it counted renderer instances; 1,014 tile ids use them. A hand-written renderer counts as having one main call if exactly one compute result is checked for `.error`, or if it has a single compute call outside any loop. The 172 left out need hand-written wiring, page by page.

## How it works

- `ui-fields.js` exports `makeStepsPanel(parent, region)`, which builds only the empty collapsed box. Each `_simpleRenderer` copy adds two lines: it creates the panel after its output lines, and it hands the panel each result. The panel hides itself when the compute returns an error, and keeps itself attached and last if a renderer rebuilds its outputs.
- Hand-written renderers have no field list, so `ui-fields.js` also exports `stepsFor(outputRegion, inputRegion, keys, r)`, one line placed after the main compute call. The panel is created on first use. The inputs are read off the page at draw time, each control with its own `<label for>` caption and the value it shows: the option text for a select, yes or no for a checkbox. `keys` are the compute's argument names, which keep input echoes out of the worked values; they are null where the argument is not an object literal (13 renderers).
- The rows come from a new `steps-panel.js`: a pure `stepRows(fields, params, r, humanize)` and the drawing code. It and `key-labels.js` are **dynamically imported the first time the panel opens**, so a page where nobody opens it downloads neither. The split also keeps `ui-fields.js` inside its gzip budget (5,752 of 6,144 B; `steps-panel.js` is 1,205 B).
- The panel reuses the existing collapsed-disclosure styling (`note-row`). It is a native `<details>`, so it works by keyboard and screen reader, and it stays out of "Copy all", which copies the answer only.

## Known limits

- Worked-value labels come from `humanizeKey`, the same captioner the agent door and the static shells already use. A few read awkwardly ("Fleet fuel 70 gal per (day)" for `fleet_fuel_70_gal_per_day`). Improving the captioner is a separate change, because it also rewrites every shell and the field index.
- Every finite number the compute returns is listed, including ones already printed above. The panel is an audit trail, not a summary.

## Proof

`test/unit/steps-panel-guard.test.js` runs `stepRows` over 1,161 tiles with a field schema and 2,845 worked examples, and fails on `undefined`, `NaN`, `Infinity` or a bare `null` in any label or value, or on an input row that does not match the field list. A second test checks that every one of the 76 `_simpleRenderer` copies creates the panel and feeds it each result. A third checks the same for every hand-written renderer with one main compute call; removing the hook from `renderVoltageDrop` turns it red. A fourth unit-tests reading inputs off the page: blank, hidden and unlabelled controls are skipped, and argument names stay out of the worked values. Breaking the formatter on purpose produced 13,963 bad rows. In a real browser, on skip-line-layout and generator-fleet-fuel-resupply (declarative) and on branch-circuit-wire-footage, motor-run-hours-for-budget and voltage-drop (hand-written), the panel opens by mouse and keyboard and hides on an error. It stays out of "Copy all"; `collectOutputs` skips any row without a value `<span>`, and the panel's headings have none. It does not scroll sideways at 375 px, and on a fresh load neither module downloads until it is opened.
