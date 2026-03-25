// ElementFilter - content.js
// Applies per-keyword filters with individual scope radii.
// keywords shape: [{ text: string, radius: number }]

const STORAGE_KEY   = 'elementfilter_data';
const ATTR_FILTERED = 'data-ef-filtered';

let state = {
  enabled:  true,
  mode:     'hide',   // 'hide' | 'blur' | 'strikethrough'
  keywords: []        // [{ text, radius }]
};

// ── Styles ────────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('ef-styles')) return;
  const s = document.createElement('style');
  s.id = 'ef-styles';
  s.textContent = `
    [data-ef-filtered="hide"] { display: none !important; }

    [data-ef-filtered="blur"] {
      filter: blur(8px) !important;
      transition: filter 0.2s ease;
      cursor: pointer;
    }
    [data-ef-filtered="blur"]:hover { filter: blur(3px) !important; }

    [data-ef-filtered="strikethrough"] {
      position: relative !important;
      opacity: 0.45 !important;
    }
    [data-ef-filtered="strikethrough"]::after {
      content: '' !important;
      position: absolute !important;
      top: 50% !important; left: 0 !important; right: 0 !important;
      height: 2px !important;
      background: #e53e3e !important;
      transform: translateY(-50%) !important;
      pointer-events: none !important;
      z-index: 9999 !important;
    }
  `;
  document.head.appendChild(s);
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function textMatches(text, keyword) {
  return keyword.trim() !== '' &&
    text.toLowerCase().includes(keyword.toLowerCase().trim());
}

/** Walk up the DOM to find the most meaningful container for a text node. */
function findBestContainer(el) {
  const blockTags = ['LI', 'ARTICLE', 'TR', 'SECTION'];
  let node = el;
  for (let depth = 0; depth < 8 && node && node !== document.body; depth++) {
    if (blockTags.includes(node.tagName)) return node;
    if ((node.tagName === 'DIV' || node.tagName === 'SECTION') && node.offsetHeight > 20) return node;
    node = node.parentElement;
  }
  return el.parentElement || el;
}

/** Walk N levels further up from a base element, stopping before <body>. */
function walkUp(el, steps) {
  let node = el;
  for (let i = 0; i < steps; i++) {
    if (!node.parentElement ||
        node.parentElement === document.body ||
        node.parentElement === document.documentElement) break;
    node = node.parentElement;
  }
  return node;
}

// ── Filter logic ──────────────────────────────────────────────────────────────

function buildTextNodeList() {
  const nodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT','STYLE','NOSCRIPT','META','HEAD'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (node.textContent.trim() === '') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

function clearAllFilters() {
  document.querySelectorAll(`[${ATTR_FILTERED}]`)
    .forEach(el => el.removeAttribute(ATTR_FILTERED));
}

function filterAll() {
  if (!state.enabled || state.keywords.length === 0) return;
  injectStyles();

  const textNodes = buildTextNodeList();

  for (const kw of state.keywords) {
    if (!kw.text || kw.text.trim() === '') continue;
    const targets = new Set();

    for (const tn of textNodes) {
      if (textMatches(tn.textContent, kw.text)) {
        const base   = findBestContainer(tn.parentElement);
        const target = walkUp(base, kw.radius ?? 0);
        targets.add(target);
      }
    }

    targets.forEach(el => el.setAttribute(ATTR_FILTERED, state.mode));
  }

  sendCountUpdate();
}

function reapplyFilters() {
  clearAllFilters();
  if (state.enabled) filterAll();
}

function getFilteredCount() {
  return document.querySelectorAll(`[${ATTR_FILTERED}]`).length;
}

function sendCountUpdate() {
  chrome.runtime.sendMessage({ type: 'COUNT_UPDATE', count: getFilteredCount() })
    .catch(() => {}); // popup may be closed
}

// ── MutationObserver (dynamic content) ───────────────────────────────────────

let debounce = null;
new MutationObserver(() => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (state.enabled && state.keywords.length > 0) filterAll();
  }, 400);
}).observe(document.body, { childList: true, subtree: true });

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'GET_STATE':
      sendResponse({ ...state, filteredCount: getFilteredCount() });
      break;

    case 'SET_STATE':
      state = { ...state, ...msg.payload };
      reapplyFilters();
      sendResponse({ ok: true, count: getFilteredCount() });
      break;

    case 'GET_COUNT':
      sendResponse({ count: getFilteredCount() });
      break;
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────

chrome.storage.local.get(STORAGE_KEY, data => {
  if (data[STORAGE_KEY]) {
    const s = data[STORAGE_KEY];
    state.enabled  = s.enabled  ?? true;
    state.mode     = s.mode     ?? 'hide';
    // Migrate legacy string[] keywords
    state.keywords = (s.keywords ?? []).map(k =>
      typeof k === 'string' ? { text: k, radius: 0 } : k
    );
  }
  if (state.enabled && state.keywords.length > 0) {
    injectStyles();
    filterAll();
  }
});
