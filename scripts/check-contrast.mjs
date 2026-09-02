#!/usr/bin/env node
// Colour contrast, computed from styles.css and checked against what
// docs/accessibility.md says.
//
// The site targets WCAG 2.2 Level AA and states a stricter 7:1 body-text
// floor. axe-core runs over all 1,804 routes in CI and covers SC 1.4.3
// (Contrast (Minimum)) on rendered text -- but two things it cannot do were
// unwatched:
//
//   1. SC 1.4.11 (Non-text Contrast, also AA) on the boundary of a text field.
//      Whether a border is "required to identify the component" is not
//      machine-decidable, so axe does not judge it. The fields' border was
//      1.14:1 against the region they sit in.
//   2. Tell whether the PROSE describing the palette is true. docs/
//      accessibility.md said "Light theme only. Pure white #FFFFFF background.
//      Near-black #0A0A0A primary text." -- the exact inverse of what ships:
//      `:root` is the dark theme and light is the opt-in override. It also
//      quoted contrast ratios nothing recomputed.
//
// So this gate reads the tokens out of styles.css, computes the real ratios in
// BOTH themes, fails any pair below its floor, and fails the doc if a ratio it
// prints is not the one the stylesheet produces. A palette edit that darkens a
// token now reddens the build instead of quietly shipping.
//
// Usage: `node scripts/check-contrast.mjs [--verbose]` (wired into npm run lint).

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");

function ruleBlock(css, selector) {
  const at = css.indexOf(selector);
  if (at === -1) return null;
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  if (open === -1 || close === -1) return null;
  return css.slice(open + 1, close);
}

function tokensIn(block) {
  const out = {};
  for (const m of block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\b/g)) out["--" + m[1]] = m[2].toLowerCase();
  return out;
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map((pair) => {
    const v = parseInt(pair, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const round = (n) => Math.round(n * 100) / 100;

// Each pair names a floor and why it is that number.
//   7    -- the project's own body-text promise, stricter than AA's 4.5.
//   4.5  -- WCAG 2.2 SC 1.4.3, normal-size text.
//   3    -- WCAG 2.2 SC 1.4.11, the visual boundary of a user-interface
//           component, and SC 1.4.3 for large text.
const PAIRS = [
  { fg: "--fg", bg: "--bg-primary", floor: 7, what: "body text on the page" },
  { fg: "--fg", bg: "--bg-secondary", floor: 7, what: "body text on a raised surface" },
  { fg: "--fg-muted", bg: "--bg-primary", floor: 7, what: "secondary text on the page" },
  { fg: "--fg-muted", bg: "--bg-secondary", floor: 7, what: "secondary text on a raised surface" },
  { fg: "--fg-dim", bg: "--bg-primary", floor: 4.5, what: "dim text (placeholders, meta) on the page" },
  { fg: "--fg-dim", bg: "--bg-secondary", floor: 4.5, what: "dim text on a raised surface" },
  { fg: "--accent", bg: "--bg-primary", floor: 4.5, what: "link text" },
  { fg: "--error-text", bg: "--bg-primary", floor: 4.5, what: "validation message text" },
  { fg: "--border-control", bg: "--bg-tertiary", floor: 3, what: "a field's edge against the region around it" },
  { fg: "--border-control", bg: "--bg-primary", floor: 3, what: "a field's edge against its own fill" },
  { fg: "--border-control", bg: "--bg-secondary", floor: 3, what: "a focused field's edge against its fill" },
];

async function main() {
  const css = await readFile(resolve(ROOT, "styles.css"), "utf8");
  const errors = [];

  const darkBlock = ruleBlock(css, ":root {");
  const lightBlock = ruleBlock(css, ':root[data-theme="light"]');
  if (!darkBlock || !lightBlock) {
    console.error("check-contrast: could not find the :root and :root[data-theme=\"light\"] token blocks in styles.css.");
    process.exit(1);
  }
  const dark = tokensIn(darkBlock);
  const lightTokens = tokensIn(lightBlock);
  const light = { ...dark, ...lightTokens };

  // The light palette is declared THREE times, and all three have to agree.
  //
  //   1. :root[data-theme="light"]           -- the explicit toggle.
  //   2. @media (prefers-color-scheme: light) -- a reader who never runs it,
  //      which on the 1,826 prerendered pages is every reader: those load no
  //      script and so never get a data-theme attribute at all.
  //   3. @media print                        -- printing the dark theme put
  //      white text on white paper. The four !important rules there covered
  //      body and three containers; every descendant kept its token, so the
  //      ANSWER did not appear on the page.
  //
  // Three copies of one palette drift, so they are compared rather than
  // trusted.
  const copies = [
    [':root:not([data-theme="dark"])', "the prefers-color-scheme block"],
    ["@media print", "the print block"],
  ];
  for (const [selector, what] of copies) {
    const block = selector === "@media print"
      ? ruleBlock(css.slice(css.indexOf("@media print")), ":root {")
      : ruleBlock(css, selector);
    if (!block) {
      errors.push(`styles.css: no light-palette copy found for ${what}.`);
      continue;
    }
    const copyTokens = tokensIn(block);
    for (const key of [...new Set([...Object.keys(lightTokens), ...Object.keys(copyTokens)])].sort()) {
      if (lightTokens[key] !== copyTokens[key]) {
        errors.push(
          `styles.css: ${key} is ${lightTokens[key] || "absent"} under :root[data-theme="light"] but ` +
            `${copyTokens[key] || "absent"} in ${what}. One palette, three copies.`,
        );
      }
    }
  }

  const measured = new Map();
  for (const [themeName, tokens] of [["dark", dark], ["light", light]]) {
    for (const pair of PAIRS) {
      const fg = tokens[pair.fg];
      const bg = tokens[pair.bg];
      if (!fg || !bg) {
        errors.push(`styles.css: the ${themeName} theme defines no value for ${!fg ? pair.fg : pair.bg}.`);
        continue;
      }
      const ratio = contrast(fg, bg);
      measured.set(`${themeName} ${pair.fg} ${pair.bg}`, ratio);
      if (VERBOSE) {
        console.log(`  ${themeName.padEnd(5)} ${pair.fg} on ${pair.bg}  ${fg}/${bg}  ${round(ratio).toFixed(2)}:1  (floor ${pair.floor})`);
      }
      if (ratio < pair.floor) {
        errors.push(
          `styles.css (${themeName} theme): ${pair.what} -- ${pair.fg} ${fg} on ${pair.bg} ${bg} ` +
            `is ${round(ratio).toFixed(2)}:1, below the ${pair.floor}:1 floor.`,
        );
      }
    }
  }

  // The doc's own table. Every row is "| <token> on <token> | <hex>/<hex> |
  // <n>:1 | <n>:1 |" -- dark ratio then light ratio -- and each must be the
  // number this script just computed, to two decimals.
  const doc = await readFile(resolve(ROOT, "docs", "accessibility.md"), "utf8");
  const rows = [...doc.matchAll(
    /^\|\s*`(--[a-z-]+)`\s+on\s+`(--[a-z-]+)`\s*\|[^|]*\|\s*([\d.]+):1\s*\|\s*([\d.]+):1\s*\|$/gm,
  )];
  if (rows.length < PAIRS.length) {
    errors.push(
      `docs/accessibility.md: read ${rows.length} contrast row(s) but this gate measures ${PAIRS.length} pair(s). ` +
        "Every measured pair must be stated, so the doc cannot describe a palette the stylesheet does not have.",
    );
  }
  for (const [, fgTok, bgTok, darkSaid, lightSaid] of rows) {
    for (const [themeName, said] of [["dark", darkSaid], ["light", lightSaid]]) {
      const key = `${themeName} ${fgTok} ${bgTok}`;
      if (!measured.has(key)) {
        errors.push(`docs/accessibility.md: states a ratio for ${fgTok} on ${bgTok}, which this gate does not measure.`);
        continue;
      }
      const live = round(measured.get(key)).toFixed(2);
      if (live !== Number(said).toFixed(2)) {
        errors.push(
          `docs/accessibility.md: says ${fgTok} on ${bgTok} is ${said}:1 in the ${themeName} theme; ` +
            `styles.css gives ${live}:1.`,
        );
      }
    }
  }

  if (errors.length) {
    console.error("check-contrast FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(
    `check-contrast OK: ${PAIRS.length} colour pair(s) in both themes meet their WCAG floors, ` +
      "the light palette is identical in its toggle, prefers-color-scheme and print declarations, " +
      `and every ratio docs/accessibility.md prints is the one styles.css produces.`,
  );
}

main();
