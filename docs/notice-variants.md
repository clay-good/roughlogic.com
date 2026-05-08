# Inline notice variants

Every calculator tile carries a per-view inline notice. The wording is fixed; only the variant changes per group / per id. The notice is rendered above the tool's input region, with `role="note"` for assistive tech.

The variant is selected in `app.js` (the `view-tool` mounting path). Per-id overrides take precedence over per-group selection so cross-trade reference tiles (e.g., `sales-tax-nexus` lives in Group H but carries the legal-information variant) get the right message.

## Variants in use

| Variant | Constant | Wording |
|---|---|---|
| Default (AHJ-governs) | `NOTICE_DEFAULT` | "This is a math aid for verification. Local codes, manufacturer specifications, and the authority having jurisdiction govern all installations and inspections." |
| Fire-ground SOP | `NOTICE_FIRE` | "This is a math aid for verification. Departmental SOPs and incident command govern all fireground operations." |
| Historical reference | `NOTICE_HISTORICAL` | "Reference only. Bundled at build time. Ask your supplier for a current quote." |
| Tax-law (v5) | `NOTICE_TAX_LAW` | "Estimate only. Tax law changes. Confirm with the current IRS publication or a licensed CPA before filing." |
| Legal-information (v5) | `NOTICE_LEGAL` | "This is legal information, not legal advice. Statutes and court rules change. Verify with current state code and a licensed attorney before relying on this for a filing or a deadline." |
| Bench-science (v5) | `NOTICE_LAB` | "Verify protocol against your lab's SOP before pipetting. A miscalculated dilution can ruin a run or a sample." |
| Worker-safety (per-tool) | inlined per renderer | e.g., utility 268 lab-safety carries "If a chemical spill exceeds your lab's spill-kit capacity or involves an unknown agent, stop, evacuate, and call your environmental health and safety office or 911." |

## Selection rules

The selector in `app.js` runs in this order:

1. **Per-id overrides.** Group H reference tiles that span trades:
   - `sales-tax-nexus` -> `NOTICE_LEGAL` (post-Wayfair guidance is a legal threshold, not a code requirement)
   - `irs-form-index` -> `NOTICE_TAX_LAW` (IRS forms are tax administration)
2. **Per-group rules.**
   - Group Q (historical) -> `NOTICE_HISTORICAL`
   - Group R (accounting / tax) -> `NOTICE_TAX_LAW`
   - Group S (legal) -> `NOTICE_LEGAL`
   - Group T (lab) -> `NOTICE_LAB`
3. **Trade-based fallback.** Any tool whose `trades` array includes `fire` -> `NOTICE_FIRE`.
4. **Default.** All other tiles -> `NOTICE_DEFAULT`.

## Adding a new variant

1. Add a `NOTICE_<NAME>` constant near the top of `app.js`.
2. Add the matching `GOVERNANCE.<name>` entry in `citations.js` so the v6 reference block on each tile renders the same wording from the structured citation.
3. Wire the selection rule in the same priority block in `app.js`.
4. Update this file with the wording and the rule.
5. Verify with `npm test` (the v6 audit asserts every tile id has a `CITATIONS` entry whose `governance` matches one of the bundled variants).

## What a notice is for

The notice exists so a casual user who lands on a tile from a search engine, a coworker's link, or a hash bookmark gets the constraint of the calculation in one sentence before reading any number. It is the load-bearing answer to the question "should I rely on this?" and the answer is always: not without verifying against the controlling authority (AHJ, IRS, state code, your lab's SOP).

The notice is not a disclaimer for the project's benefit. It is a specification of who is in charge of the answer.
