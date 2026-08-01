# roughlogic.com Specification v1190 -- MCP Input Guardrails: Range Validation and Limitation Banners (mcp/catalog.mjs, mcp/server.mjs, 0 New Tiles)

> **Status: PROPOSED (2026-07-31). Platform spec, second of the three-part "MCP full agent integration, part 2" series (v1189-v1191).**
> Spec-only session: no code lands with this file. No new tile, module, group, dependency, or hosted service.
> Inherits spec.md through spec-v1189.md.
>
> **The gap, and the evidence for it.** v1184 validates one thing: that a `select` input is one of its enum
> options. Everything else the browser enforces is invisible over MCP. Numeric fields carry `attrs` with
> `min`/`max`/`step`/`required` that the browser enforces through HTML5 `checkValidity()` (ui-validity.js:32) --
> pass `length_ft: -5` or a value past a field's `max` over MCP and `run_calculator` computes on it silently.
> And the site puts a **limitation banner** above the inputs on every simplified-screening tile
> (limitation-banner.js `CANONICAL` / `getLimitationCopy`) -- "Not a Manual J load calculation," "Not an IEEE
> 1584 study" -- the single most important thing a person sees before trusting the number. An agent running
> `manual-j-cooling` or `arc-flash-screen` over MCP sees none of it. Both guardrails already exist as data;
> surface them on the run so an agent is warned exactly where a person is warned.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

Read-only over existing data. The numeric constraints come from the `attrs` already retained on each input
descriptor (v1184); the banner copy comes from the existing `limitation-banner.js` registry. No new validation
rules are authored -- the MCP surface enforces the same constraints the browser enforces, so an input rejected
in the form is warned over MCP (the v589 principle, extended from search and inputs to validation). DOM-free
(the constraints are read from `attrs`, not from `checkValidity`, which needs the DOM), no new dependency.

## 2. Range validation on run (mcp/catalog.mjs, mcp/server.mjs)

`run_calculator` (and `run_calculators`) validates every numeric input against its field `attrs` before
computing, and returns structured, non-fatal warnings:

```
warnings: [
  { key: "length_ft", value: -5, rule: "min", limit: 0,
    message: "length_ft is below the field minimum (0)." },
  { key: "temp_C", value: 260, rule: "max", limit: 200,
    message: "temp_C is above the field maximum (200)." }
]
```

- A `required` field passed as `null`/absent, or a value outside `[min, max]`, produces a warning naming the
  rule and the limit.
- Warnings are **advisory, not fatal**: the run still returns its result, because the compute functions are
  total (they clamp or guard internally) and an agent doing a deliberate sensitivity sweep past a nominal
  bound is a legitimate use. This mirrors the browser, which keeps the last valid output visible rather than
  refusing to compute (ui-validity.js §11.2).
- An out-of-set `select` (already a hard error per v1184) stays a hard error -- an enum has no defensible
  out-of-range meaning; a numeric bound does.

## 3. Limitation banners on describe and run (mcp/catalog.mjs)

For any tile with canonical limitation copy (`getLimitationCopy(id)`), `describe_calculator` and
`run_calculator` include it as structured fields:

```
limitation: {
  headline:    "Not a Manual J load calculation.",
  replacement: "A code-compliant load calculation requires ACCA Manual J 8th ed. ...",
  who_governs: "The AHJ and the licensed mechanical designer govern.",
  link:        "acca.org"
}
```

`limitation` is `null` for tiles without a banner. This is the same object `limitation-banner.js` renders in the
browser, read straight from its registry -- no new copy, and it composes with v1185's `scope_note` (the machine
"what this does not check") to give an agent both the human-facing warning and the structured limit.

## 4. Scope

Input guardrails and screening disclosure only. No change to any compute function, to the numbers, or to the
browser. Warnings do not block a run (the compute stays authoritative). This does not add banners to tiles that
lack them, and it does not reproduce copyrighted tables -- the banner names the governing standard, exactly as
the site already shows.

## 5. Wiring

`catalog.mjs` gains a `validateInputs(descriptor, inputs)` reader that walks the v1184 input descriptors,
compares each numeric input to its `attrs.min`/`attrs.max`/`attrs.step`/`required`, and returns the warning
array; `run`/`runMany` attach it as `warnings`. `describe`/`run` call `getLimitationCopy(id)` (imported from
the existing module) and attach `limitation`. `server.mjs` is unchanged in shape -- the new fields ride the
existing tool results. Tests: a validation test asserting an out-of-`min` numeric returns one warning naming
`min` and its limit while still returning a result; a test asserting an in-range run returns `warnings: []`; a
limitation test asserting `manual-j-cooling` reports its "Not a Manual J load calculation" headline on both
describe and run; and a degradation test asserting a banner-less tile returns `limitation: null`. Cross-linked
back to v1184 (enum validation) and v1185 (`scope_note`), and forward to v1191 (the reachability gate exercises
these fields across the whole catalog).
