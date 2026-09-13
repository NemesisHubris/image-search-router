# Google Images for Brave Search

Click **Images** in Brave Search to open Google Images in a new tab.
Your Brave results stay open. Includes a toolbar icon and a saved on/off switch.

## Install

1. [Download the extension ZIP](https://github.com/NemesisHubris/brave-google-images/releases/latest/download/brave-google-images.zip) and unzip it.
2. Open `brave://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder containing `manifest.json`.
4. Refresh Brave Search. Pin the extension icon to access the toggle.

If you clone this repository, load the `extension` folder instead.
After updating, reload the extension and refresh Brave Search.

## Test

```sh
npm ci
npx playwright install chromium
npm test
```

15 headless Chromium tests pass. Google may still show its own CAPTCHA.
See [TESTING.md](TESTING.md) for details.
