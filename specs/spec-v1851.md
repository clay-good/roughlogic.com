# roughlogic.com Specification v1851 -- Homepage Search Snippet

> **Status: LANDED 2026-09-27.** Homepage SEO only. No calculator, route, formula, or catalog change.

## Outcome

Search results should explain the product in one sentence instead of quoting a runtime warning.

## Requirements

1. The homepage title and H1 name the product category: free calculators for the trades.
2. The visible lede, meta description, Open Graph description, Twitter description, JSON-LD website description,
   and the SPA's restored home description use this pitch:

   > Get fast, source-backed answers from 2,183 free calculators for electrical, plumbing, HVAC, construction, and more.

3. Runtime integrity warnings remain visible and accessible to people, but the warning element carries Google's
   supported `data-nosnippet` attribute so it is not eligible for a search-result snippet.
4. A unit test holds title, description, structured-data, and visible-copy parity and verifies the warning's
   snippet exclusion.

## Non-goals

This does not hide the warning, suppress snippets for the page, change calculator-page metadata, add keyword
lists, or promise rankings. Google chooses the final title and snippet after it recrawls the page.
