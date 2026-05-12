// v5 Step 62 utility 269: spec-mandated Playwright test that downloads
// the CSV from a live amortization tool and asserts the row count and
// header line.
//
// CI-only. Local dev does not require Playwright; `npm test` only runs
// unit tests. The shared dilution-style test for the same builder lives
// in test/unit/v5-platform.test.js.

import { test, expect } from "@playwright/test";

test("CSV export: amortization Copy CSV button downloads RFC-4180 file", async ({ page }) => {
  await page.goto("/index.html#loan-amortization");

  // Click the spec's "Test with example" button to fill inputs.
  await page.getByRole("button", { name: "Test with example" }).click();

  // The renderer is debounced; wait for the table to appear.
  const table = page.locator("#am-out-schedule table");
  await expect(table).toBeVisible({ timeout: 5000 });

  // Capture the download triggered by the Copy CSV button.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download table as CSV" }).click();
  const download = await downloadPromise;

  // Filename should match rl-loan-amortization-<8 hex chars>.csv per the
  // attachCsvExport implementation in v5-platform.js.
  expect(download.suggestedFilename()).toMatch(/^rl-loan-amortization-[0-9a-f]{8}\.csv$/);

  // Read the downloaded file content.
  const path = await download.path();
  const fs = await import("node:fs");
  const csv = fs.readFileSync(path, "utf8");

  // Header line invariant: matches the rendered table thead order.
  const lines = csv.split("\r\n");
  expect(lines[0]).toBe("Month,Payment,Principal,Interest,Balance");

  // Row count invariant: the example is a 30-yr / 360-month loan with no
  // extra principal, so the schedule is exactly 360 rows. Header + 360
  // rows = 361 total lines.
  expect(lines.length).toBe(361);

  // First data row's month column is "1".
  expect(lines[1].split(",")[0]).toBe("1");

  // Last data row's month column is "360".
  expect(lines[360].split(",")[0]).toBe("360");
});

test("CSV export: PCR master mix Copy CSV header matches rendered thead", async ({ page }) => {
  await page.goto("/index.html#pcr-master-mix");
  await page.getByRole("button", { name: "Test with example" }).click();
  const table = page.locator(".tabular-tool table").first();
  await expect(table).toBeVisible({ timeout: 5000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download table as CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^rl-pcr-master-mix-[0-9a-f]{8}\.csv$/);

  const path = await download.path();
  const fs = await import("node:fs");
  const csv = fs.readFileSync(path, "utf8");
  const lines = csv.split("\r\n");

  // Header line: "Component,Per reaction (uL),Total (uL)" - cell with comma
  // would be RFC-4180 quoted, but these headers have no embedded commas.
  expect(lines[0]).toContain("Component");
  expect(lines[0]).toContain("Per reaction (uL)");
  expect(lines[0]).toContain("Total (uL)");

  // The example fixture has 5 components -> header + 5 = 6 lines.
  expect(lines.length).toBe(6);
});

test("CSV export: mileage-rollup Copy CSV header matches rendered thead", async ({ page }) => {
  // v10 §E.2 CSV-parity expansion: the third tile wired to attachCsvExport
  // is the IRS mileage rollup (calc-accounting.js line 893). The example
  // fixture writes two trips ("2025-03-01,42,Client visit" + "2025-03-04,
  // 18,Supply run"), so the rendered table is exactly two body rows.
  await page.goto("/index.html#mileage-rollup");
  await page.getByRole("button", { name: "Test with example" }).click();
  const table = page.locator(".tabular-tool table").first();
  await expect(table).toBeVisible({ timeout: 5000 });

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download table as CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^rl-mileage-rollup-[0-9a-f]{8}\.csv$/);

  const path = await download.path();
  const fs = await import("node:fs");
  const csv = fs.readFileSync(path, "utf8");
  const lines = csv.split("\r\n");

  // Header invariant: matches the thead order written at calc-accounting
  // .js line 880 ("Date","Miles","Purpose","Deductible").
  expect(lines[0]).toBe("Date,Miles,Purpose,Deductible");

  // Row count invariant: header + 2 body rows = 3 lines.
  expect(lines.length).toBe(3);

  // First data row's date column is "2025-03-01".
  expect(lines[1].split(",")[0]).toBe("2025-03-01");
  expect(lines[2].split(",")[0]).toBe("2025-03-04");
});
