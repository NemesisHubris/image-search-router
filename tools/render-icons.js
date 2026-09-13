import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

// The SVG is the editable source. Chromium renders the PNG sizes the toolbar needs.
const iconDirectory = path.resolve("extension/icons");
const svg = await readFile(path.join(iconDirectory, "icon.svg"), "utf8");
await mkdir(".tmp", { recursive: true });

const context = await chromium.launchPersistentContext(path.resolve(".tmp/icon-renderer"), {
  channel: "chromium",
  headless: true
});

try {
  const page = await context.newPage();
  await page.setContent(svg);
  await page.addStyleTag({
    content: "body { margin: 0; } svg { display: block; width: 100vw; height: 100vh; }"
  });

  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.screenshot({
      path: path.join(iconDirectory, `icon-${size}.png`),
      omitBackground: true
    });
  }
} finally {
  await context.close();
}

console.log("Rendered the 16, 32, 48, and 128 pixel icons.");
