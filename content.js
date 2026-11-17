"use strict";

(() => {
  const { mentionsBrand, youtubeVideoId, matchWatchPage } = globalThis.HiggsFieldMatching;
  const host = location.hostname;
  const youtube = host === "www.youtube.com";
  const cards = {
    "www.youtube.com": "ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model, ytd-promoted-sparkles-web-renderer, ytd-in-feed-ad-layout-renderer",
    "x.com": 'article[data-testid="tweet"]',
    "twitter.com": 'article[data-testid="tweet"]',
    "www.reddit.com": "shreddit-post",
    "www.instagram.com": "main article",
    "www.threads.com": '[data-pressable-container="true"]',
    "www.threads.net": '[data-pressable-container="true"]'
  }[host];
  const stateAttribute = "data-hff-state";
  const badgeAttribute = "data-hff-badge";
  const revealed = new WeakMap();
  const observed = new WeakSet();
  const visible = new WeakSet();
  const cache = new Map();
  const queue = [];
  const dirty = new Set();
  let active = 0;
  let scheduled = false;

  function setState(card, state) {
    if (card.getAttribute(stateAttribute) === state && card.querySelector(`:scope > [${badgeAttribute}]`)) return;
    const previous = card.querySelector(`:scope > [${badgeAttribute}]`);
    if (!state) {
      card.removeAttribute(stateAttribute);
      previous?.remove();
      return;
    }
    const badge = previous ?? document.createElement("span");
    badge.setAttribute(badgeAttribute, "");
    const label = document.createElement("span");
    label.textContent = {
      checking: "Checking video details…",
      blocked: "Higgsfield content hidden",
      revealed: "Higgsfield ad / mention"
    }[state];
    badge.replaceChildren(label);
    if (state === "blocked") {
      const heading = document.createElement("strong");
      heading.dataset.hffHeading = "";
      const symbol = document.createElement("span");
      symbol.dataset.hffSymbol = "";
      symbol.setAttribute("aria-hidden", "true");
      heading.append(symbol, label);
      badge.replaceChildren(heading);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Show anyway";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const restoreFocus = document.activeElement === button;
        revealed.set(card, contentKey(card));
        setState(card, "revealed");
        if (restoreFocus) card.querySelector("a[href], button, video[controls]")?.focus({ preventScroll: true });
      });
      badge.append(button);
    }
    card.setAttribute(stateAttribute, state);
    if (!previous) card.append(badge);
    if (state !== "revealed") {
      for (const video of card.querySelectorAll("video")) video.pause();
    }
  }

  function contentKey(card) {
    if (youtube) return cardId(card);
    const postId = card.getAttribute("post-id");
    if (postId) return postId;
    const timestampLink = card.querySelector("a[href] > time")?.parentElement;
    const permalink = timestampLink ?? card.querySelector(
      'a[href*="/status/"], a[href*="/comments/"], a[href*="/p/"], a[href*="/reel/"], a[href*="/post/"]'
    );
    return permalink?.pathname ?? null;
  }

  function brandInCard(card) {
    const text = Array.from(card.childNodes, node =>
      node.nodeType === Node.ELEMENT_NODE && node.hasAttribute(badgeAttribute) ? "" : node.textContent
    ).join(" ");
    if (mentionsBrand(text)) return true;
    const metadata = ["title", "aria-label", "alt", "post-title", "author", "data-expanded-url"];
    const elements = [card, ...card.querySelectorAll("a[href], [title], [aria-label], img[alt], [data-expanded-url]")];
    return elements.some(element => {
      if (element.hasAttribute(badgeAttribute)) return false;
      if (metadata.some(name => mentionsBrand(element.getAttribute(name)))) return true;
      const href = element.getAttribute("href");
      if (!href) return false;
      try {
        return mentionsBrand(decodeURIComponent(href));
      } catch {
        return mentionsBrand(href);
      }
    });
  }

  function pump() {
    while (active < 4 && queue.length) {
      const { id, entry } = queue.shift();
      if (![...entry.cards].some(card => card.isConnected && homepage() && cardId(card) === id)) {
        cache.delete(id);
        continue;
      }
      active += 1;
      inspectVideo(id, entry).finally(() => {
        active -= 1;
        pump();
      });
    }
  }

  async function inspectVideo(id, entry) {
    let result = null;
    try {
      const response = await fetch(`/watch?v=${id}`, { signal: AbortSignal.timeout(8000) });
      if (response.ok) result = matchWatchPage(await response.text(), id);
    } catch {
      // Release the card when metadata cannot be retrieved.
    }
    entry.result = result;
    const waiting = entry.cards;
    entry.cards = null;
    for (const card of waiting) scan(card);
    if (cache.size > 500) {
      for (const [key, value] of cache) {
        if (!value.cards) cache.delete(key);
        if (cache.size <= 400) break;
      }
    }
  }

  function homepage() {
    return location.pathname === "/";
  }

  function cardId(card) {
    for (const link of card.querySelectorAll('a[href^="/watch"], a[href^="/shorts/"], a[href^="https://www.youtube.com/"]')) {
      const id = youtubeVideoId(link.href);
      if (id) return id;
    }
    return null;
  }

  const intersection = youtube ? new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        visible.add(target);
        scan(target);
      } else {
        visible.delete(target);
      }
    }
  }, { rootMargin: "250px" }) : null;

  function scan(card) {
    if (!card.isConnected) {
      intersection?.unobserve(card);
      observed.delete(card);
      visible.delete(card);
      return;
    }
    if (youtube && card.parentElement?.closest(cards)) return;
    if (revealed.has(card)) {
      if (revealed.get(card) === contentKey(card)) {
        setState(card, "revealed");
        return;
      }
      revealed.delete(card);
    }
    if (brandInCard(card)) {
      setState(card, "blocked");
      return;
    }
    if (!youtube || !homepage()) {
      setState(card, null);
      return;
    }
    const id = cardId(card);
    if (!id) {
      setState(card, null);
      return;
    }
    let entry = cache.get(id);
    if (entry && !entry.cards) {
      setState(card, entry.result ? "blocked" : null);
      return;
    }
    setState(card, "checking");
    if (!observed.has(card)) {
      observed.add(card);
      intersection.observe(card);
    }
    if (!visible.has(card)) return;
    if (entry) {
      entry.cards.add(card);
      return;
    }
    entry = { cards: new Set([card]) };
    cache.set(id, entry);
    queue.push({ id, entry });
    pump();
  }

  function collect(node, includeDescendants) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element || element.closest(`[${badgeAttribute}]`)) return;
    const card = element.closest(cards);
    if (card) dirty.add(youtube ? outerCard(card) : card);
    if (includeDescendants) {
      for (const child of element.querySelectorAll(cards)) dirty.add(child);
    }
  }

  function outerCard(card) {
    let parent = card.parentElement?.closest(cards);
    while (parent) {
      card = parent;
      parent = card.parentElement?.closest(cards);
    }
    return card;
  }

  function flush() {
    scheduled = false;
    for (const card of dirty) scan(card);
    dirty.clear();
  }

  function schedule() {
    if (!scheduled && dirty.size) {
      scheduled = true;
      queueMicrotask(flush);
    }
  }

  new MutationObserver(records => {
    for (const record of records) {
      collect(record.target, false);
      for (const node of record.addedNodes) collect(node, true);
      for (const node of record.removedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE || !youtube || node.isConnected) continue;
        if (node.matches(cards)) dirty.add(node);
        for (const card of node.querySelectorAll(cards)) dirty.add(card);
      }
    }
    schedule();
  }).observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["href", "title", "aria-label", "alt", "post-title", "post-id", "author", "data-expanded-url"]
  });

  function scanPage() {
    for (const card of document.querySelectorAll(cards)) dirty.add(card);
    schedule();
  }

  document.addEventListener("play", event => {
    if (event.target instanceof HTMLVideoElement && event.target.closest(`[${stateAttribute}]:not([${stateAttribute}="revealed"])`)) {
      event.target.pause();
    }
  }, true);
  document.addEventListener("yt-navigate-finish", scanPage);
  scanPage();
})();
