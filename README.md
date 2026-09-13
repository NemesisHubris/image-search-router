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
4. Pin the icon. It starts with **Brave → Google**. Click **+ Add route** for more.

Each row has a search engine on the left and its image destination on the right.
Use **×** to remove a route, or the switch to turn everything off.

Cloned the repo? Load the `extension` folder. After updating, reload the extension
and refresh your search pages. Your existing Brave preference is preserved.

## Custom image engines

Choose **Custom engine…** in either dropdown. Give it a name and an image-search URL,
using `{query}` where the search words go. A custom source also needs its web-search URL
and the browser's permission to run on that site. Refresh the site's open tabs afterward.

Custom sites should have an Images navigation link. For unusual buttons, use the optional
selector under **Advanced**. Search sites can still show CAPTCHAs or access blocks;
Kagi requires an account.

## Chrome Web Store

I'm using this for personal use right now. If you [donate on Ko-fi](https://ko-fi.com/kindlemodshelfguy)
and let me know you want this in the Chrome Web Store, I'll add it there.
