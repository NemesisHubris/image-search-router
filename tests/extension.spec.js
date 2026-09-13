import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { launchExtension, openPopup } from "./browser.js";

const braveSearchUrl = "https://search.brave.com/search?q=red+panda";
const fixture = await readFile(new URL("./fixtures/search.html", import.meta.url), "utf8");

let browser;
let context;
let page;

test.beforeEach(async () => {
  browser = undefined;
  browser = await launchExtension();
  context = browser.context;

  // The real extension is loaded by Chromium, not injected by the test.
  // Local responses keep behavioral tests independent of CAPTCHAs and outages.
  await context.route("https://search.brave.com/**", async (route) => {
    await route.fulfill({ contentType: "text/html", body: fixture });
  });

  await context.route("https://www.google.com/**", async (route) => {
    await route.fulfill({ contentType: "text/html", body: "<h1>Google destination</h1>" });
  });

  page = await context.newPage();
  await page.goto(braveSearchUrl);
  await expect(page.locator("#images")).toHaveAttribute("target", "_blank");
});

test.afterEach(async () => {
  if (browser) {
    await browser.close();
  }
});

async function expectGoogleTab(action, expectedQuery = "red panda") {
  const originalUrl = page.url();
  const tabCount = context.pages().length;
  const newTabPromise = context.waitForEvent("page");

  await action();

  const googleTab = await newTabPromise;
  await googleTab.waitForURL("https://www.google.com/search?**");

  const destination = new URL(googleTab.url());
  expect(destination.searchParams.get("q")).toBe(expectedQuery);
  expect(destination.searchParams.get("udm")).toBe("2");
  expect(destination.searchParams.has("source")).toBe(false);
  expect(context.pages()).toHaveLength(tabCount + 1);
  expect(page.url()).toBe(originalUrl);
  expect(await googleTab.evaluate(() => window.opener)).toBeNull();

  await googleTab.close();
}

test("clicking the Images text opens one Google tab and preserves Brave", async () => {
  await expectGoogleTab(() => page.locator("#images span").click());
  await expect(page.locator("#images")).toHaveText("Images");
});

test("keyboard Enter opens Google in a new tab", async () => {
  await page.locator("#images").focus();
  await expectGoogleTab(() => page.keyboard.press("Enter"));
});

test("middle clicking opens Google in a new tab", async () => {
  await expectGoogleTab(() => page.locator("#images").click({ button: "middle" }));
});

test("Control-click opens only one Google tab", async () => {
  await expectGoogleTab(() => page.locator("#images").click({ modifiers: ["Control"] }));
});

test("updated queries preserve punctuation, Unicode, and literal plus signs", async () => {
  const query = 'café 猫 + C++ & "black and white" #100%';

  await page.locator("#images").evaluate((link, newQuery) => {
    const destination = new URL("https://search.brave.com/images");
    destination.searchParams.set("q", newQuery);
    link.href = destination.href;
  }, query);

  await expectGoogleTab(() => page.locator("#images").click(), query);
});

test("replacement navigation links are handled without reloading", async () => {
  await page.locator("#primary-tabs").evaluate((tabs) => {
    tabs.innerHTML = '<li><a id="replacement" href="/images?q=moon">Bilder</a></li>';
  });

  await expect(page.locator("#replacement")).toHaveAttribute("target", "_blank");
  await expectGoogleTab(() => page.locator("#replacement").click(), "moon");
});

test("missing link query uses the current page query", async () => {
  await page.locator("#images").evaluate((link) => {
    link.href = "/images";
  });

  await expectGoogleTab(() => page.locator("#images").click());
});

test("empty queries, unrelated tabs, and thumbnails stay untouched", async () => {
  await expect(page.locator("#videos")).toHaveAttribute("href", "/videos?q=red+panda");
  await expect(page.locator("#all")).toHaveAttribute("href", "/search?q=red+panda");
  await expect(page.locator("#thumbnail")).toHaveAttribute("href", /context=preview/);
  await expect(page.locator("#thumbnail")).not.toHaveAttribute("target", "_blank");
  await expect(page.locator("#result")).toHaveAttribute("href", "https://example.com/");

  await page.locator("#primary-tabs").evaluate((tabs) => {
    tabs.innerHTML = '<li><a id="empty" href="/images?q=">Images</a></li>';
  });

  await expect(page.locator("#empty")).toHaveAttribute("href", "/images?q=");
  await expect(page.locator("#empty")).not.toHaveAttribute("target", "_blank");
});

test("Videos still navigates in the original tab", async () => {
  const tabCount = context.pages().length;
  await page.locator("#videos").click();
  await expect(page).toHaveURL("https://search.brave.com/videos?q=red+panda");
  expect(context.pages()).toHaveLength(tabCount);
});

test("the navigation captured from the real Brave page opens Google", async () => {
  const capturedFile = new URL("./fixtures/brave-navigation.html", import.meta.url);
  const capturedNavigation = await readFile(capturedFile, "utf8");

  await context.route("https://search.brave.com/**", async (route) => {
    await route.fulfill({ contentType: "text/html", body: capturedNavigation });
  });

  await page.reload();

  const imagesLink = page.locator("#primary-tabs").getByRole("link", { name: "Images", exact: true });
  await expect(imagesLink).toHaveAttribute("target", "_blank");
  await expectGoogleTab(() => imagesLink.click());
});

test("the popup switch turns off the extension immediately", async () => {
  const popup = await openPopup(context);
  const toggle = popup.getByRole("switch", { name: "Use Google Images" });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();

  await expect(popup.getByRole("status")).toHaveText("Off · Images opens in Brave as usual.");
  await expect(page.locator("#images")).toHaveAttribute("href", "/images?q=red+panda&source=web");
  await expect(page.locator("#images")).not.toHaveAttribute("target", "_blank");
  await expect(page.locator("#images")).not.toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.locator("#images")).not.toHaveAttribute("title");

  const tabCount = context.pages().length;
  await page.locator("#images").click();
  await expect(page).toHaveURL("https://search.brave.com/images?q=red+panda&source=web");
  expect(context.pages()).toHaveLength(tabCount);
});

test("the choice survives reopening the popup and reloading Brave", async () => {
  let popup = await openPopup(context);
  await popup.getByRole("switch").uncheck();
  await expect(popup.getByRole("status")).toContainText("Off");
  await popup.close();

  await page.reload();
  popup = await openPopup(context);
  await expect(popup.getByRole("switch")).not.toBeChecked();
  await expect(popup.getByRole("switch")).toBeEnabled();
  await expect(page.locator("#images")).toHaveAttribute("href", "/images?q=red+panda&source=web");

  // Space is the standard keyboard interaction for an accessible switch.
  await popup.getByRole("switch").focus();
  await popup.keyboard.press("Space");
  await expect(popup.getByRole("status")).toContainText("On");
  await expectGoogleTab(() => page.locator("#images").click());
});

test("turning off restores the latest query and original link attributes", async () => {
  const customFixture = fixture.replace(
    'id="images"',
    'id="images" target="_self" rel="nofollow" title="Find pictures"'
  );

  await context.route("https://search.brave.com/**", async (route) => {
    await route.fulfill({ contentType: "text/html", body: customFixture });
  });

  await page.reload();
  await expect(page.locator("#images")).toHaveAttribute("target", "_blank");
  await page.locator("#images").evaluate((link) => {
    link.href = "/images?q=moon&source=web";
  });
  await expect(page.locator("#images")).toHaveAttribute("href", /google.com.*q=moon/);

  const popup = await openPopup(context);
  await popup.getByRole("switch").uncheck();
  await expect(page.locator("#images")).toHaveAttribute("href", "/images?q=moon&source=web");
  await expect(page.locator("#images")).toHaveAttribute("target", "_self");
  await expect(page.locator("#images")).toHaveAttribute("rel", "nofollow");
  await expect(page.locator("#images")).toHaveAttribute("title", "Find pictures");
});

test("the switch updates all already-open Brave Search tabs", async () => {
  const secondTab = await context.newPage();
  await secondTab.goto(braveSearchUrl);
  await expect(secondTab.locator("#images")).toHaveAttribute("target", "_blank");

  const popup = await openPopup(context);
  await popup.getByRole("switch").uncheck();

  for (const tab of [page, secondTab]) {
    await expect(tab.locator("#images")).not.toHaveAttribute("target", "_blank");
    await expect(tab.locator("#images")).toHaveAttribute("href", "/images?q=red+panda&source=web");
  }

  await popup.getByRole("switch").check();

  for (const tab of [page, secondTab]) {
    await expect(tab.locator("#images")).toHaveAttribute("target", "_blank");
  }
});

test("a link Brave repurposes for Videos loses the extension's new-tab behavior", async () => {
  await page.locator("#images").evaluate((link) => {
    link.href = "/videos?q=red+panda";
    link.textContent = "Videos";
  });

  await expect(page.locator("#images")).toHaveAttribute("href", "/videos?q=red+panda");
  await expect(page.locator("#images")).not.toHaveAttribute("target", "_blank");
  const tabCount = context.pages().length;
  await page.locator("#images").click();
  await expect(page).toHaveURL("https://search.brave.com/videos?q=red+panda");
  expect(context.pages()).toHaveLength(tabCount);
});
