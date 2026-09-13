# Test results — September 13, 2026

## Passed

Version **1.1.0**: `npm test`: **15 passed in 6.0 seconds**, running the real unpacked extension in
headless Chromium (Google Chrome for Testing 145.0.7632.6), with Playwright 1.58.2.

- Click the nested Images text: exactly one Google Images tab; Brave stays open.
- Keyboard Enter, middle-click, and Control-click: correct new-tab behavior.
- Updated query: Unicode, quotes, ampersands, percent signs, and literal plus signs survive.
- Replaced navigation: the new link works, including a translated label.
- Missing query in the link: use the query from the current Brave page.
- Empty queries, other tabs, image previews, and search results: left intact.
- Videos click: still navigates the original tab normally.
- Navigation captured from the real Brave response: Images opens Google correctly.
- Popup switch: disabling immediately restores Brave navigation in the original tab.
- Saved preference: survives reopening the popup and reloading Brave; Space re-enables it.
- Restoration: retains the latest query and the original target, rel, and title.
- Multiple tabs: toggling changes all open Brave Search pages immediately.
- Reused navigation element: a link changed to Videos regains normal navigation.

The destination tests use controlled HTTP responses. They assert URL parameters,
tab count, the original page URL, and `window.opener === null`. They do not
substitute or manually inject the extension's JavaScript.

The popup was visually inspected in both states at 320 pixels wide. Its icon
loads, the status is readable, and there is no horizontal or vertical overflow.
The actual extension popup document was exercised as an extension page with
real extension storage. Screenshots: `artifacts/popup-on.png` and `popup-off.png`.
Calling `chrome.action.openPopup()` also opened the real toolbar dropdown. In a
normal browser window it measured 320 × 186 pixels with no content overflow.

JavaScript syntax checks passed. Chromium reported no extension manifest errors.

## Live network checks

- An HTTP fetch of Brave Search returned 200 and supplied the captured navigation.
- Google Images returned `X-Frame-Options: SAMEORIGIN`, blocking a normal embedded frame.
- The unmocked headless Brave Search visit returned 429 and a bot challenge.
- A separate headless Google Images visit redirected to Google's `/sorry/` challenge.

Therefore, a complete live search-to-thumbnails browser test **did not pass**.
The extension implements the requested fallback: open the genuine Google Images
page in another tab. Google may ask for consent or a CAPTCHA there.

Screenshots and the failed live-run report are in `artifacts/chromium/`.

## Brave Origin attempt

Installed version: Brave Origin 153.1.95.101, Chromium 153.0.8010.37.
Playwright connected to its debugging protocol, but the persistent-context
startup did not expose a normal page and timed out, including a 90-second trial.
No passing Brave Origin automation result is claimed. The successful browser
tests above are from bundled Chromium.

The extension uses standard Manifest V3 content scripts, with no Brave-specific
browser APIs. Its only site dependency is Brave Search's navigation markup.
