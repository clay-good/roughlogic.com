// Sitemap <lastmod>. Every one of the 1,827 URLs used to carry the build
// timestamp, so a crawler saw the whole catalog claiming to have changed today
// on every push -- next to a <changefreq> of `monthly` on the same URL. The
// ledger records the hash of the bytes each URL serves and the date that hash
// was last stamped, so a page that has not moved keeps its date.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { diffLedger, LEDGER_PATH } from "../../scripts/build-page-lastmod.mjs";

const ledgerOf = (pages) => ({ pages });

test("an unchanged page is neither added nor changed", () => {
  const hashes = new Map([["/tools/ohms-law/", "aaaa"]]);
  const d = diffLedger(hashes, ledgerOf({ "/tools/ohms-law/": { sha: "aaaa", date: "2026-07-04" } }));
  assert.deepEqual(d, { added: [], changed: [], removed: [] });
});

test("a page whose bytes moved is reported as changed", () => {
  const hashes = new Map([["/tools/ohms-law/", "bbbb"]]);
  const d = diffLedger(hashes, ledgerOf({ "/tools/ohms-law/": { sha: "aaaa", date: "2026-07-04" } }));
  assert.deepEqual(d.changed, ["/tools/ohms-law/"]);
});

test("a new page and a retired page are each reported once", () => {
  const hashes = new Map([["/tools/new-tile/", "cccc"]]);
  const d = diffLedger(hashes, ledgerOf({ "/tools/gone/": { sha: "dddd", date: "2026-07-04" } }));
  assert.deepEqual(d.added, ["/tools/new-tile/"]);
  assert.deepEqual(d.removed, ["/tools/gone/"]);
  assert.deepEqual(d.changed, []);
});

test("the committed ledger covers every URL shape the sitemap emits", async () => {
  const ledger = JSON.parse(await readFile(LEDGER_PATH, "utf8"));
  const paths = Object.keys(ledger.pages);
  assert.ok(paths.includes("/"), "no entry for the home page");
  assert.ok(paths.includes("/tools/"), "no entry for the catalog hub");
  assert.ok(paths.some((p) => p.startsWith("/groups/")), "no entry for any group hub");
  assert.ok(paths.filter((p) => /^\/tools\/.+\/$/.test(p)).length > 1000, "no entries for the tile shells");
  for (const [path, row] of Object.entries(ledger.pages)) {
    assert.match(row.sha, /^[0-9a-f]{16}$/, `${path}: sha is not a 16-hex digest`);
    assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/, `${path}: date is not an ISO calendar date`);
  }
});
