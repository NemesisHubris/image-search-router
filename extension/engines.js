"use strict";

// Every built-in engine can be both a source site and an image destination.
const ImageSearch = (() => {
  const engines = [
    {
      id: "brave", name: "Brave", queryKey: "q",
      hosts: ["search.brave.com"],
      url: "https://search.brave.com/images?q={query}"
    },
    {
      id: "google", name: "Google", queryKey: "q",
      hosts: ["google.com", "www.google.com", "images.google.com"],
      url: "https://www.google.com/search?udm=2&q={query}"
    },
    {
      id: "bing", name: "Bing", queryKey: "q",
      hosts: ["bing.com", "www.bing.com"],
      url: "https://www.bing.com/images/search?q={query}"
    },
    {
      id: "duckduckgo", name: "DuckDuckGo", queryKey: "q",
      hosts: ["duckduckgo.com", "www.duckduckgo.com", "html.duckduckgo.com", "noai.duckduckgo.com"],
      url: "https://duckduckgo.com/?q={query}&iax=images&ia=images"
    },
    {
      id: "yahoo", name: "Yahoo", queryKey: "p",
      hosts: ["search.yahoo.com", "images.search.yahoo.com"],
      url: "https://images.search.yahoo.com/search/images?p={query}"
    },
    {
      id: "yandex", name: "Yandex", queryKey: "text",
      hosts: ["yandex.com", "www.yandex.com", "yandex.ru", "www.yandex.ru"],
      url: "https://yandex.com/images/search?text={query}"
    },
    {
      id: "startpage", name: "Startpage", queryKey: "query",
      hosts: ["startpage.com", "www.startpage.com"],
      url: "https://www.startpage.com/sp/search?cat=images&query={query}"
    },
    {
      id: "ecosia", name: "Ecosia", queryKey: "q",
      hosts: ["ecosia.org", "www.ecosia.org"],
      url: "https://www.ecosia.org/images?q={query}"
    },
    {
      id: "qwant", name: "Qwant", queryKey: "q",
      hosts: ["qwant.com", "www.qwant.com"],
      url: "https://www.qwant.com/?t=images&q={query}"
    },
    {
      id: "mojeek", name: "Mojeek", queryKey: "q",
      hosts: ["mojeek.com", "www.mojeek.com", "www.mojeek.co.uk"],
      url: "https://www.mojeek.com/search?q={query}&fmt=images"
    },
    {
      id: "kagi", name: "Kagi", queryKey: "q",
      hosts: ["kagi.com", "www.kagi.com"],
      url: "https://kagi.com/images?q={query}"
    }
  ];

  function validateCustomUrl(value) {
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

  function engineForHost(hostname) {
    return engines.find((engine) => engine.hosts.includes(hostname));
  }

  function normalizeSettings(saved) {
    const settings = {
      enabled: saved.enabled !== false,
      routes: { ...saved.routes },
      customEngines: Array.isArray(saved.customEngines) ? saved.customEngines : []
    };

    // Upgrades preserve the old Brave destination and the old custom URL.
    // Other source engines stay unchanged until the user chooses a destination.
    if (!saved.routes) {
      settings.routes = { brave: saved.engine || "google" };
      if (saved.engine === "custom" && saved.customUrl) {
        settings.customEngines = [{
          id: "custom-legacy", name: "My engine", url: saved.customUrl
        }];
        settings.routes.brave = "custom-legacy";
      }
    }
    return settings;
  }

  function destinationFor(query, destinationId, settings) {
    const choices = [...engines, ...settings.customEngines];
    const selected = choices.find((engine) => engine.id === destinationId);
    if (!selected) {
      return null;
    }

    const template = validateCustomUrl(selected.url);
    const encodedQuery = encodeURIComponent(query);
    return new URL(template.replaceAll("{query}", encodedQuery)).href;
  }

  return { engines, engineForHost, normalizeSettings, validateCustomUrl, destinationFor };
})();
