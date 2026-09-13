(() => {
  "use strict";

  // Only change the top search tabs. Image thumbnails and result links stay intact.
  const searchTabSelector = "#primary-tabs a[href]";
  const linkTitle = "Search Google Images (opens in a new tab)";

  // Remember the original attributes so switching off requires no page reload.
  const originalLinks = new WeakMap();
  let enabled = false;
  let settingChanged = false;

  function restoreAttribute(link, name, originalValue, extensionValue) {
    // Preserve any attribute Brave has changed since we last touched the link.
    if (link.getAttribute(name) !== extensionValue) {
      return;
    }

    if (originalValue === null) {
      link.removeAttribute(name);
    } else {
      link.setAttribute(name, originalValue);
    }
  }

  function restoreBraveLink(link) {
    const original = originalLinks.get(link);

    if (!original) {
      return;
    }

    restoreAttribute(link, "href", original.href, original.googleHref);
    restoreAttribute(link, "target", original.target, "_blank");
    restoreAttribute(link, "rel", original.rel, "noopener noreferrer");
    restoreAttribute(link, "title", original.title, linkTitle);
    originalLinks.delete(link);
  }

  function useGoogleImages(link) {
    if (!enabled) {
      restoreBraveLink(link);
      return;
    }

    const previous = originalLinks.get(link);

    if (previous && link.href === previous.googleHref) {
      return;
    }

    const braveUrl = new URL(link.href);

    if (braveUrl.origin !== "https://search.brave.com") {
      restoreBraveLink(link);
      return;
    }

    if (braveUrl.pathname !== "/images") {
      restoreBraveLink(link);
      return;
    }

    // Prefer the link's query, because Brave updates it after a new search.
    const currentPageUrl = new URL(window.location.href);
    const query = braveUrl.searchParams.get("q") ?? currentPageUrl.searchParams.get("q");

    if (!query || !query.trim()) {
      restoreBraveLink(link);
      return;
    }

    const googleUrl = new URL("https://www.google.com/search");
    googleUrl.searchParams.set("q", query);
    googleUrl.searchParams.set("udm", "2");

    // When Brave updates the query on an existing link, save the new Brave URL
    // while retaining the original target, rel, and title attributes.
    const original = previous ?? {
      target: link.getAttribute("target"),
      rel: link.getAttribute("rel"),
      title: link.getAttribute("title")
    };
    original.href = link.getAttribute("href");
    original.googleHref = googleUrl.href;
    originalLinks.set(link, original);

    link.href = googleUrl.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = linkTitle;
  }

  function updateSearchTabs() {
    const searchTabs = document.querySelectorAll(searchTabSelector);

    for (const link of searchTabs) {
      useGoogleImages(link);
    }
  }

  function keepNativeTabOpening(event) {
    if (!enabled) {
      return;
    }

    if (!(event.target instanceof Element)) {
      return;
    }

    const link = event.target.closest(searchTabSelector);

    if (!link) {
      return;
    }

    // Handle a click even if Brave has just replaced the link.
    useGoogleImages(link);

    const destination = new URL(link.href);

    if (destination.origin !== "https://www.google.com") {
      return;
    }

    if (destination.pathname !== "/search") {
      return;
    }

    if (destination.searchParams.get("udm") !== "2") {
      return;
    }

    // Stop Brave's page router from navigating the original tab.
    // Keep the browser's default action for clicks, Enter, and middle clicks.
    event.stopImmediatePropagation();
  }

  window.addEventListener("click", keepNativeTabOpening, true);
  window.addEventListener("auxclick", keepNativeTabOpening, true);

  // Brave can replace its navigation without loading a new document.
  // Watching href changes also catches searches that reuse the same link.
  const observer = new MutationObserver(updateSearchTabs);
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href"]
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.enabled) {
      return;
    }

    settingChanged = true;
    enabled = changes.enabled.newValue !== false;
    updateSearchTabs();
  });

  chrome.storage.local.get({ enabled: true }).then((settings) => {
    // A toggle made during startup takes priority over this initial read.
    if (!settingChanged) {
      enabled = settings.enabled !== false;
      updateSearchTabs();
    }
  }).catch((error) => {
    console.warn("Google Images could not read its on/off setting.", error);
  });
})();
