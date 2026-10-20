# spec-v1970.md -- Feet, inches and fractions in length fields

> **Status: LANDED 2026-10-20 (proposed 2026-10-19). Platform spec, no tile added. As built: `makeNumber` and `makeRowField` detect a closing (ft) or (in) label themselves (a small regex in `length-entry.js` rather than importing field-units.js), so no renderer and no call site changed; the box's `value` getter returns the parsed decimal. query-fill.js keeps its own rewrite table; a test holds the two parsers to the same feet-and-inches answers instead of moving the table. An independent review added: curly quotes and primes (phones' smart punctuation) read as tape marks, fractional feet (1-1/2'), and rounding of the decimal to 10 places. Phone decimal keypads have no apostrophe, quote, dash or slash, so on a phone the tape spellings are pasted or typed from a hardware keyboard; the keypad was kept because most entries are decimals. A comma decimal (8,5) that some locales' number fields accepted is now refused with the reason. The spelling table (46 rows), the refusals, the tick-form render sweep (1,295 boxes, 751 tiles) and the e2e test are as written. Part of [scope-product-expansion](scope-product-expansion.md). Extends the one-box parser of spec-v1339 / spec-v1341 to the calculator's own input boxes.** Catalog stays at **2,267**.

## What it does for you

A carpenter reads a tape as `8'-6"` or `3-1/2"`, not as 8.5 or 3.5. Today every length box on the site is a browser number field, so typing `8'6"` into "Length one-way (ft)" leaves the box empty and the answer blank. After this change, any box whose unit is feet or inches takes what the tape says:

| You type | The box reads it as |
|---|---|
| `8'6"`, `8' 6"`, `8 ft 6 in`, `8-6` (feet box) | 8.5 ft |
| `8'6"` in an inches box | 102 in |
| `3-1/2`, `3 1/2`, `3-1/2"` | 3.5 in |
| `5/8` | 0.625 in |
| `12.5` | 12.5, exactly as before |

A one-line hint under the box shows the decimal the calculator will use ("= 8.5 ft"), so a misread is visible before the answer is. The URL, the worked example, the MCP server and every test keep using plain decimals; only the typing changes.

## Why this is the right place to spend effort

Of the catalog's 7,322 input descriptors, 832 labels end in `(in)` and 667 in `(ft)`: one field in five is a length. The one-box search already understands every spelling above (query-fill.js `REWRITES` and `frac`, spec-v1341), so a reader who types `voltage drop 8'6" 12 awg` gets 8.5 ft filled in, then cannot type the same thing into the box it filled. That asymmetry is the defect.

## Rules

- A field qualifies when `unitFromLabel` (field-units.js) resolves its label to exactly `ft` or `in`. "in wc", "in Hg" and psi stay numeric. Nothing else changes for fields that do not qualify.
- A qualifying field is rendered `type="text" inputmode="decimal"` with the same `min`, `max` and `step` attributes, now enforced on the parsed value by the field code rather than by the browser, and reported through `setCustomValidity` so ui-validity.js keeps striking through stale output and printing the reason beside the box.
- Parsing is one shared module, `length-entry.js`, exporting `parseLength(text, unit)` and the existing rewrite table moves there so query-fill.js and the field code cannot drift. The tick form is one measurement by construction; the spelled form keeps the under-12-inches guard spec-v1341 added.
- The parsed decimal is what the renderer, the hash state (`#tool?key=8.5`) and the report dialog see. A reader who shares a URL shares the decimal, as today.
- Plain decimals and negative numbers parse unchanged. Anything that does not parse is invalid, with the reason "Enter a number, 8'6, 8 ft 6 in, or 3-1/2".
- "Test with example" and prefill write decimals into the box, as today; the hint line then reads "= 8.5 ft" under them.

## How it is built

| Piece | Role |
|---|---|
| `length-entry.js` | `parseLength`, the spelling table, and the hint text. No DOM. |
| `ui-fields.js` `makeNumber` / `makeRowField` | Take an optional `unit`; when it is `ft` or `in`, build the text box, wire `input` to the parser, and keep a hidden decimal the renderers read. The 401 hand-written renderers that read `Number(input.value)` get the decimal from the same accessor, so none is edited. |
| query-fill.js | Imports the table from `length-entry.js`; behaviour unchanged. |
| `docs/unit-notation-in-labels.md` | Gains the rule that a `(ft)` or `(in)` label is also a promise about what the box accepts. |

## Proof

- `length-entry.test.js`: a table of 40 spellings, each with the decimal it must produce in a feet box and in an inches box, plus 12 strings that must be refused (`8'15"`, `1/0`, `--3`).
- The fake-DOM render sweep (`render-text-sweep`) types each worked example's length values in tick form into the live box and asserts the printed answer is unchanged from the decimal run, across every tile with a qualifying field.
- An e2e test types `8'6"` into `voltage-drop`'s length box on a phone-width viewport and reads 8.5 ft in the hint and the matching drop in the answer.
- `check-us-defaults` is unchanged: no label gains a metric unit.

## Not in v1

- The MCP door keeps taking numbers. An agent that holds `8'6"` can call `parseLength` itself in v2 if demand shows up in `answer_query` refusals.
- Area and volume spellings (`12' x 14'`) and architectural `8'-6 1/2"` with both a dash and a space are parsed only where the table lists them; new spellings are added to the table with a test row, never by loosening the regex.
