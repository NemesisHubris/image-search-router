import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchExtension } from "./browser.js";

const browserName = process.env.BROWSER_EXECUTABLE ? "brave-origin" : "chromium";
const artifactDirectory = path.resolve("artifacts", browserName);
await mkdir(artifactDirectory, { recursive: true });

const browser = await launchExtension();
const context = browser.context;
const report = {
  date: new Date().toISOString(),
  browser: browserName,
  network: "Live Brave Search and Google; no mocked responses",
  passed: false
};

try {
  const braveTab = await context.newPage();
  const response = await braveTab.goto("https://search.brave.com/search?q=red+panda", {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });

  report.braveStatus = response.status();

  const imagesLink = braveTab.locator('#primary-tabs a[title="Search Google Images (opens in a new tab)"]');
  await imagesLink.waitFor({ state: "visible", timeout: 15000 });

  // Wait for Brave's own page code to load before exercising the modified link.
  await braveTab.waitForLoadState("load", { timeout: 15000 });
  const originalUrl = braveTab.url();
  report.link = await imagesLink.getAttribute("href");
  await braveTab.screenshot({ path: path.join(artifactDirectory, "brave-search.png") });

  const newTabPromise = context.waitForEvent("page", { timeout: 15000 });
  await imagesLink.click();
  const googleTab = await newTabPromise;
  await googleTab.waitForLoadState("domcontentloaded", { timeout: 30000 });

  report.googleUrl = googleTab.url();
  report.googleTitle = await googleTab.title();
  report.originalTabPreserved = braveTab.url() === originalUrl;

  assert.equal(report.originalTabPreserved, true);

  const googleUrl = new URL(googleTab.url());
  assert.equal(googleUrl.hostname, "www.google.com");
  assert.equal(googleUrl.pathname, "/search");
  assert.equal(googleUrl.searchParams.get("q"), "red panda");

  const isImageSearch = googleUrl.searchParams.get("udm") === "2"
    || googleUrl.searchParams.get("tbm") === "isch";
  assert.equal(isImageSearch, true);

  // Require real, loaded thumbnails, so a CAPTCHA cannot count as a success.
  await googleTab.waitForFunction(() => {
    const thumbnails = Array.from(document.images).filter((image) => {
      return image.complete && image.naturalWidth >= 80 && image.naturalHeight >= 60;
    });

    return thumbnails.length >= 5;
  }, null, { timeout: 15000 });

  report.loadedThumbnails = await googleTab.evaluate(() => {
    return Array.from(document.images).filter((image) => {
      return image.complete && image.naturalWidth >= 80 && image.naturalHeight >= 60;
    }).length;
  });

  await googleTab.screenshot({ path: path.join(artifactDirectory, "google-images.png") });
  report.passed = true;
} catch (error) {
  report.error = error.message;

  for (const [index, tab] of context.pages().entries()) {
    await tab.screenshot({ path: path.join(artifactDirectory, `failure-tab-${index}.png`) });
  }

  process.exitCode = 1;
} finally {
  await writeFile(path.join(artifactDirectory, "live-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
