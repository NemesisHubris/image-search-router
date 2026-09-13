(() => {
  "use strict";

  // Only change the top search tabs. Image thumbnails and result links stay intact.
  const searchTabSelector = "#primary-tabs a[href]";
  const linkTitle = "Search images with your chosen engine (opens in a new tab)";

  // Remember the original attributes so switching off requires no page reload.
  const originalLinks = new WeakMap();
  let settings = { ...ImageSearch.defaults, enabled: false };
  const changedSettings = new Set();

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

    restoreAttribute(link, "href", original.href, original.destinationHref);
    restoreAttribute(link, "target", original.target, "_blank");
    restoreAttribute(link, "rel", original.rel, "noopener noreferrer");
    restoreAttribute(link, "title", original.title, linkTitle);
    originalLinks.delete(link);
  }

  function useSelectedEngine(link) {
    if (!settings.enabled) {
      restoreBraveLink(link);
      return;
    }

    const previous = originalLinks.get(link);

    if (previous && link.href === previous.destinationHref) {
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

    let destination;

    try {
      destination = ImageSearch.destinationFor(query, settings);
    } catch {
      restoreBraveLink(link);
      return;
    }

    // When Brave updates the query on an existing link, save the new Brave URL
    // while retaining the original target, rel, and title attributes.
    const original = previous ?? {
      target: link.getAttribute("target"),
      rel: link.getAttribute("rel"),
      title: link.getAttribute("title")
    };
    original.href = link.getAttribute("href");
    original.destinationHref = destination;
    originalLinks.set(link, original);

    link.href = destination;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = linkTitle;
  }

  function updateSearchTabs() {
    const searchTabs = document.querySelectorAll(searchTabSelector);

    for (const link of searchTabs) {
      useSelectedEngine(link);
    }
  }

  function keepNativeTabOpening(event) {
    if (!settings.enabled) {
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
    useSelectedEngine(link);
    const original = originalLinks.get(link);

    if (!original || link.href !== original.destinationHref) {
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
    if (areaName !== "local") {
      return;
    }

    const changedKeys = Object.keys(ImageSearch.defaults).filter((key) => key in changes);

    if (changedKeys.length === 0) {
      return;
    }

    // Restore the saved Brave URLs before applying a different engine.
    for (const link of document.querySelectorAll(searchTabSelector)) {
      restoreBraveLink(link);
    }

    for (const key of changedKeys) {
      changedSettings.add(key);
      settings[key] = changes[key].newValue ?? ImageSearch.defaults[key];
    }

    updateSearchTabs();
  });

  chrome.storage.local.get(ImageSearch.defaults).then((savedSettings) => {
    // A toggle made during startup takes priority over this initial read.
    for (const key of Object.keys(ImageSearch.defaults)) {
      if (!changedSettings.has(key)) {
        settings[key] = savedSettings[key];
      }
    }

    updateSearchTabs();
  }).catch((error) => {
    console.warn("Image Search could not read its settings.", error);
  });
})();
