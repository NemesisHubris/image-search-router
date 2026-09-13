import { chromium } from "@playwright/test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";

export async function launchExtension() {
  const temporaryDirectory = path.resolve(".tmp");
  await mkdir(temporaryDirectory, { recursive: true });

  const profileDirectory = await mkdtemp(path.join(temporaryDirectory, "profile-"));
  const extensionDirectory = path.resolve("extension");

  const options = {
    channel: "chromium",
    headless: true,
    timeout: 15000,
    downloadsPath: path.join(temporaryDirectory, "downloads"),
    viewport: { width: 1440, height: 1000 },
    args: [
      `--disable-extensions-except=${extensionDirectory}`,
      `--load-extension=${extensionDirectory}`
    ]
  };

  // This optional path lets the same tests run against installed Brave Origin.
  if (process.env.BROWSER_EXECUTABLE) {
    options.executablePath = process.env.BROWSER_EXECUTABLE;
  }

  let context;

  try {
    context = await chromium.launchPersistentContext(profileDirectory, options);
  } catch (error) {
    await rm(profileDirectory, { recursive: true, force: true });
    throw error;
  }

  async function close() {
    await context.close();
    await rm(profileDirectory, { recursive: true, force: true });
  }

  return { context, close };
}

export async function openPopup(context) {
  // Discover the installed ID instead of adding a background worker just for tests.
  const extensionManager = await context.newPage();
  await extensionManager.goto("chrome://extensions");

  const installed = await extensionManager.evaluate(() => {
    return chrome.developerPrivate.getExtensionsInfo({ includeDisabled: true });
  });

  const extension = installed.find((item) => {
    return item.name === "Google Images for Brave Search";
  });

  await extensionManager.close();

  if (!extension) {
    throw new Error("The extension did not load.");
  }

  if (extension.manifestErrors.length > 0) {
    throw new Error(JSON.stringify(extension.manifestErrors));
  }

  const popup = await context.newPage();
  await popup.setViewportSize({ width: 320, height: 200 });
  await popup.goto(`chrome-extension://${extension.id}/popup.html`);
  return popup;
}
