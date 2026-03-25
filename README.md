# ElementFilter

A Chrome extension that lets you hide, blur, or strike through any web content by keyword — with per-filter scope control.

Originally built to filter Path of Exile build indexes, but works on **any website**.

![ElementFilter popup](https://raw.githubusercontent.com/YOUR_USERNAME/element-filter/screenshot.png)

---

## Features

- **3 filter modes** — Hide completely, Blur (hover to peek), or Strikethrough
- **Per-keyword scope radius** — Each keyword has its own slider (0–6 levels) that controls how far up the DOM the filter expands. Level 0 = the direct container of the match; level 6 = up to 6 ancestor elements above it.
- **Live updates** — Adjusting a slider applies the change instantly on the page
- **Dynamic content** — MutationObserver catches content loaded after the initial page render (infinite scroll, AJAX, etc.)
- **Persistent state** — All filters and settings survive browser restarts
- **Quick toggle** — ON/OFF switch to temporarily disable all filters
- **Counter** — Shows how many elements are currently filtered on the active page
- **Universal** — Works on any `http://` or `https://` page

---

## Installation

ElementFilter is not on the Chrome Web Store. Install it as an unpacked extension:

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `element-filter` folder
5. The ⚔ icon will appear in your toolbar

To update after pulling new changes, click the **↺ refresh** button on the extension card in `chrome://extensions/`.

---

## How to use

1. Click the ⚔ toolbar icon to open the popup
2. Choose a **filter mode** (Hide / Blur / Strike)
3. Type a keyword and press **Enter** or **+** to add it
4. The extension immediately filters any element on the page whose text contains that keyword
5. Use the **scope slider** under each keyword to expand or shrink how much of the page gets filtered:
   - `0` → the direct container of the matched text (most precise)
   - `+1` → its parent element
   - `+2` → grandparent
   - … up to `+6` (widest scope)
6. Remove a filter with **×**, or wipe everything with **clear all**

---

## Scope radius — how it works

When a keyword matches some text, ElementFilter first walks up the DOM to find the nearest meaningful container (a `<li>`, `<article>`, `<tr>`, or a `<div>` with some height). That's level 0.

Each step of the radius slider walks one level further up:

```
Level 0:  <div class="build-row">   ← direct container (default)
Level 1:  <div class="build-list">  ← parent
Level 2:  <section class="results"> ← grandparent
...
```

This lets you go from hiding a single row to hiding an entire section with a single drag.

---

## File structure

```
element-filter/
├── manifest.json   — Extension manifest (MV3)
├── content.js      — Injected into every page; applies filters to the DOM
├── popup.html      — Extension popup UI
├── popup.js        — Popup logic: state management, storage, messaging
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save your keyword list and settings between sessions |
| `activeTab` | Read the current tab's ID to send messages to the content script |
| `scripting` | Inject the content script into pages |
| `<all_urls>` | Run on any website (required for a universal content filter) |

---

## Contributing

PRs and issues welcome. Some ideas for future improvements:

- [ ] Per-site filter profiles
- [ ] Regex support
- [ ] Import / export filters as JSON
- [ ] Firefox support (should need minimal changes for MV2)
- [ ] Right-click context menu to add selected text as a filter

---

## License

MIT
