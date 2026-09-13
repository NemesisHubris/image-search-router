"use strict";

// Shared by the toolbar popup and the Brave Search content script.
const ImageSearch = (() => {
  const engines = [
    {
      id: "google",
      name: "Google",
      url: "https://www.google.com/search?udm=2&q={query}"
    },
    {
      id: "bing",
      name: "Bing",
      url: "https://www.bing.com/images/search?q={query}"
    },
    {
      id: "duckduckgo",
      name: "DuckDuckGo",
      url: "https://duckduckgo.com/?q={query}&iax=images&ia=images"
    },
    {
      id: "yahoo",
      name: "Yahoo",
      url: "https://images.search.yahoo.com/search/images?p={query}"
    },
    {
      id: "yandex",
      name: "Yandex",
      url: "https://yandex.com/images/search?text={query}"
    },
    {
      id: "startpage",
      name: "Startpage",
      url: "https://www.startpage.com/sp/search?cat=images&query={query}"
    }
  ];

  const defaults = {
    enabled: true,
    engine: "google",
    customUrl: ""
  };

  function validateCustomUrl(value) {
    // Also accept the %s placeholder used by browser search-engine settings.
    const template = value.trim().replaceAll("%s", "{query}");

    if (!template.includes("{query}")) {
      throw new Error("Add {query} where the search words should go.");
    }

    let url;

    try {
      url = new URL(template.replaceAll("{query}", "image-search-placeholder"));
    } catch {
      throw new Error("Enter a full URL starting with https:// or http://.");
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("The URL must start with https:// or http://.");
    }

    if (url.username || url.password) {
      throw new Error("Use a URL without a username or password.");
    }

    if (url.hostname.includes("image-search-placeholder")) {
      throw new Error("Put {query} after the website address, not inside it.");
    }

    return template;
  }

  function destinationFor(query, settings) {
    let template;

    if (settings.engine === "custom") {
      template = validateCustomUrl(settings.customUrl);
    } else {
      const selected = engines.find((engine) => engine.id === settings.engine);
      template = (selected ?? engines[0]).url;
    }

    // Encode the search words once so punctuation cannot become URL parameters.
    const encodedQuery = encodeURIComponent(query);
    return new URL(template.replaceAll("{query}", encodedQuery)).href;
  }

  return { engines, defaults, validateCustomUrl, destinationFor };
})();
