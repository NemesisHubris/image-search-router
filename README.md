# Image Search Router

Use the search engine you like for web results and a different one for images.
This started because I wasn't happy with Brave's image results.

Choose a separate image destination for each site: **Brave, Google, Bing,
DuckDuckGo, Yahoo, Yandex, Startpage, Ecosia, Qwant, Mojeek, and Kagi**.
For example, Brave → Google and DuckDuckGo → Bing can both be active.
Clicking **Images** opens your chosen engine in a new tab and keeps your search open.

## Install

1. [Download the ZIP](https://github.com/NemesisHubris/image-search-router/releases/latest/download/image-search-router.zip) and unzip it.
2. Open `brave://extensions` or `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Pin the icon and choose a destination for each source site. **Keep original** leaves that site alone.

Cloned the repo? Load the `extension` folder. After updating, reload the extension
and refresh your search pages. Your existing Brave preference is preserved.

## Custom image engines

Open **Custom image engines**, enter a name and URL, then click **Add engine**.
Use `{query}` where the search words go, such as `https://example.com/images?q={query}`.
Add as many destinations as you want, then select them in any source row.

Search sites can still show CAPTCHAs or access blocks. Kagi requires an account.
Custom destinations do not add new source websites.

## Chrome Web Store

I'm using this for personal use right now. If you [donate on Ko-fi](https://ko-fi.com/kindlemodshelfguy)
and let me know you want this in the Chrome Web Store, I'll add it there.
