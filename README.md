# Image Search for Brave

Brave's image results can be frustrating. This extension gives you an alternative
without giving up Brave Search.

Click **Images** to search with **Google, Bing, DuckDuckGo, Yahoo, Yandex,
Startpage, or your own engine**. Results open in a new tab, keeping Brave open.
The toolbar popup lets you pick an engine or switch the extension off.

## Install

1. [Download the ZIP](https://github.com/NemesisHubris/brave-google-images/releases/latest/download/brave-google-images.zip) and unzip it.
2. Open `brave://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Refresh Brave Search. Pin the extension icon to choose your engine.

Cloned the repo? Load the `extension` folder.
After updating, reload the extension and refresh Brave Search.

## Your own engine

Choose **Custom…**, paste an image-search URL, and click **Save engine**.
Use `{query}` where the search words go, for example:

```text
https://www.bing.com/images/search?q={query}
```

Your choice is saved. Search engines may still show their own CAPTCHA.
