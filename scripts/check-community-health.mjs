#!/usr/bin/env node
// Community-health surface lint.
//
// The repository page is a surface no gate had ever visited. When the repo went
// public, GitHub started rendering a set of files that live outside every
// existing checker's scope: CONTRIBUTING.md, SECURITY.md, the pull-request
// template, and the issue forms under .github/ISSUE_TEMPLATE/. `check-doc-links`
// deliberately scans only the LIVING docs (README, ARCHITECTURE, docs/*.md,
// mcp/README.md), so a dead link or a renamed doc in any of those files rots in
// silence -- and a malformed issue form fails the worst way there is: GitHub
// drops it from the "New issue" chooser without an error anywhere.
//
// This gate covers that surface:
//   1. the files GitHub surfaces exist at the paths GitHub looks for
//   2. every relative markdown link in them resolves
//   3. every issue form is structurally valid (top-level keys, known field
//      types, an id and a label on every input field)
//   4. every contact_link in config.yml is https, and a blob link into this
//      repo names a file that exists in the tree
//   5. the ASCII policy (no emoji, no em-dash) holds here too; grep-checks
//      scans the root docs and docs/, not .github/
//
// Pure read-and-report; no network, no mutation.

import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = resolve(ROOT, ".github/ISSUE_TEMPLATE");

// The exact paths GitHub reads. A rename to any of these silently drops the
// link GitHub renders on the repo page and in the new-issue flow.
const REQUIRED = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/config.yml",
];

// Markdown files on the community-health surface that check-doc-links does not
// scan. AGENTS.md is the agent-facing front door and rots the same way.
const MARKDOWN = ["CONTRIBUTING.md", "SECURITY.md", "AGENTS.md", ".github/PULL_REQUEST_TEMPLATE.md"];

const FIELD_TYPES = new Set(["markdown", "input", "textarea", "dropdown", "checkboxes"]);
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u;
const EM_DASH = String.fromCodePoint(0x2014);

const errors = [];
let links = 0;
let fields = 0;

function forms() {
  if (!existsSync(TEMPLATE_DIR)) return [];
  return readdirSync(TEMPLATE_DIR)
    .filter((f) => /\.ya?ml$/.test(f) && f !== "config.yml")
    .sort();
}

async function checkMarkdown(rel) {
  const text = await readFile(resolve(ROOT, rel), "utf8");
  const lineOf = (idx) => text.slice(0, idx).split("\n").length;
  for (const m of text.matchAll(LINK_RE)) {
    let target = m[1];
    if (/^(https?:|mailto:|#|data:)/.test(target)) continue;
    target = decodeURIComponent(target.split("#")[0]);
    if (!target) continue;
    links += 1;
    if (!existsSync(resolve(ROOT, dirname(rel), target))) {
      errors.push(rel + ":" + lineOf(m.index) + " broken relative link '" + m[1] + "'");
    }
  }
}

async function checkAscii(rel) {
  const text = await readFile(resolve(ROOT, rel), "utf8");
  text.split("\n").forEach((line, i) => {
    if (EMOJI_RE.test(line)) errors.push(rel + ":" + (i + 1) + " emoji in a shipped string");
    if (line.includes(EM_DASH)) errors.push(rel + ":" + (i + 1) + " em-dash (U+2014); use '--'");
  });
}

// GitHub issue forms are shallow and regular enough to validate by structure
// without pulling in a YAML parser (this repo ships zero runtime deps and keeps
// its dev tooling minimal on purpose). Fields start at `  - type:`; everything
// indented under one belongs to it.
async function checkForm(name) {
  const rel = ".github/ISSUE_TEMPLATE/" + name;
  const text = await readFile(resolve(ROOT, rel), "utf8");
  for (const key of ["name:", "description:", "body:"]) {
    if (!new RegExp("^" + key, "m").test(text)) {
      errors.push(rel + " has no top-level '" + key + "'; GitHub drops the form from the chooser");
    }
  }
  const blocks = text.split(/^ {2}- type:/m).slice(1);
  if (blocks.length === 0) errors.push(rel + " declares no fields under body:");
  for (const block of blocks) {
    fields += 1;
    const type = block.split("\n")[0].trim();
    if (!FIELD_TYPES.has(type)) {
      errors.push(rel + " uses unknown field type '" + type + "'");
      continue;
    }
    if (type === "markdown") continue;
    if (!/^ {4}id:/m.test(block)) errors.push(rel + " has a '" + type + "' field with no id");
    if (!/^ {6}label:/m.test(block)) {
      errors.push(rel + " has a '" + type + "' field with no attributes.label");
    }
  }
}

async function checkConfig() {
  const rel = ".github/ISSUE_TEMPLATE/config.yml";
  const text = await readFile(resolve(ROOT, rel), "utf8");
  const blocks = text.split(/^ {2}- name:/m).slice(1);
  if (blocks.length === 0) errors.push(rel + " declares no contact_links");
  for (const block of blocks) {
    const label = block.split("\n")[0].trim();
    const url = (block.match(/^ {4}url:\s*(\S+)/m) || [])[1];
    if (!url) {
      errors.push(rel + " contact link '" + label + "' has no url");
      continue;
    }
    if (!url.startsWith("https://")) {
      errors.push(rel + " contact link '" + label + "' is not https: " + url);
    }
    if (!/^ {4}about:/m.test(block)) {
      errors.push(rel + " contact link '" + label + "' has no about");
    }
    // A link into this repo's own tree is a relative link wearing a URL, and
    // rots exactly like one.
    const blob = url.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/main\/(.+)$/);
    if (blob && !existsSync(resolve(ROOT, decodeURIComponent(blob[1].split("#")[0])))) {
      errors.push(rel + " contact link '" + label + "' points at '" + blob[1] + "', which is not in the tree");
    }
  }
}

async function main() {
  for (const rel of REQUIRED) {
    if (!existsSync(resolve(ROOT, rel))) {
      errors.push("missing '" + rel + "'; GitHub reads this exact path");
    }
  }
  const templates = forms();
  if (templates.length === 0) errors.push(".github/ISSUE_TEMPLATE holds no issue form");

  for (const rel of MARKDOWN) {
    if (!existsSync(resolve(ROOT, rel))) continue;
    await checkMarkdown(rel);
    await checkAscii(rel);
  }
  for (const name of templates) {
    await checkForm(name);
    await checkAscii(".github/ISSUE_TEMPLATE/" + name);
  }
  if (existsSync(resolve(ROOT, ".github/ISSUE_TEMPLATE/config.yml"))) {
    await checkConfig();
    await checkAscii(".github/ISSUE_TEMPLATE/config.yml");
  }

  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR: " + e);
    console.error("check-community-health FAILED: " + errors.length + " problem(s).");
    process.exit(1);
  }
  console.log(
    "check-community-health OK: " +
      REQUIRED.length +
      " GitHub-surfaced paths present, " +
      templates.length +
      " issue form(s) with " +
      fields +
      " valid fields, " +
      links +
      " relative link(s) resolve across the community-health markdown, ASCII policy clean.",
  );
}

main().catch((err) => {
  console.error("check-community-health crashed:", err);
  process.exit(1);
});
