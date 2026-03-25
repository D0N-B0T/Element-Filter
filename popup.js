// ElementFilter - popup.js
// keywords shape: [{ text: string, radius: number }]

const STORAGE_KEY = 'elementfilter_data';

let state = {
  enabled: true,
  mode: 'hide',
  keywords: [],
  filteredCount: 0
};

const mainToggle  = document.getElementById('main-toggle');
const toggleLabel = document.getElementById('toggle-state-label');
const statCount   = document.getElementById('stat-count');
const statDot     = document.getElementById('stat-dot');
const kwInput     = document.getElementById('kw-input');
const addBtn      = document.getElementById('add-btn');
const kwList      = document.getElementById('kw-list');
const kwCount     = document.getElementById('kw-count');
const kwEmpty     = document.getElementById('kw-empty');
const clearAllBtn = document.getElementById('clear-all-btn');
const modeButtons = document.querySelectorAll('.mode-btn');

// ── Render ────────────────────────────────────────────────────────────────────

function renderCount(n) {
  statCount.textContent = n;
  statCount.classList.toggle('zero', n === 0);
  statDot.classList.toggle('zero', n === 0);
}

function renderModes() {
  modeButtons.forEach(btn =>
    btn.classList.toggle('active', btn.dataset.mode === state.mode)
  );
}

function renderToggle() {
  mainToggle.checked = state.enabled;
  toggleLabel.textContent = state.enabled ? 'ON' : 'OFF';
  document.body.classList.toggle('disabled', !state.enabled);
}

function renderKeywords() {
  kwList.querySelectorAll('.kw-tag').forEach(el => el.remove());
  kwEmpty.style.display = state.keywords.length === 0 ? 'block' : 'none';
  kwCount.textContent = `${state.keywords.length} filter${state.keywords.length !== 1 ? 's' : ''}`;

  state.keywords.forEach((kw, i) => {
    const radius = kw.radius ?? 0;
    const pct = (radius / 6) * 100;
    const trackBg = `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`;

    const tag = document.createElement('div');
    tag.className = 'kw-tag';
    tag.innerHTML = `
      <div class="kw-tag-top">
        <span class="kw-tag-icon">▸</span>
        <span class="kw-tag-text">${escapeHtml(kw.text)}</span>
        <button class="kw-remove" data-index="${i}" title="Remove">×</button>
      </div>
      <div class="kw-slider-row">
        <span class="kw-slider-label">scope</span>
        <input
          type="range"
          class="kw-radius-slider"
          data-index="${i}"
          min="0" max="6" step="1"
          value="${radius}"
          style="background:${trackBg}"
        />
        <span class="kw-radius-badge${radius === 0 ? ' zero' : ''}" data-badge="${i}">
          ${radius === 0 ? '0' : '+' + radius}
        </span>
      </div>
    `;
    kwList.appendChild(tag);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAll() {
  renderToggle();
  renderModes();
  renderKeywords();
  renderCount(state.filteredCount);
}

// ── Storage & sync ────────────────────────────────────────────────────────────

function saveState() {
  chrome.storage.local.set({
    [STORAGE_KEY]: {
      enabled:  state.enabled,
      mode:     state.mode,
      keywords: state.keywords
    }
  });
}

async function syncToContent() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      type: 'SET_STATE',
      payload: { enabled: state.enabled, mode: state.mode, keywords: state.keywords }
    });
    if (res?.count !== undefined) {
      state.filteredCount = res.count;
      renderCount(state.filteredCount);
    }
  } catch (_) { /* chrome:// or uninjected tab */ }
}

async function fetchCount() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_COUNT' });
    if (res?.count !== undefined) {
      state.filteredCount = res.count;
      renderCount(state.filteredCount);
    }
  } catch (_) { /* silent */ }
}

// ── Events ────────────────────────────────────────────────────────────────────

mainToggle.addEventListener('change', () => {
  state.enabled = mainToggle.checked;
  renderToggle();
  saveState();
  syncToContent();
});

modeButtons.forEach(btn => btn.addEventListener('click', () => {
  state.mode = btn.dataset.mode;
  renderModes();
  saveState();
  syncToContent();
}));

addBtn.addEventListener('click', addKeyword);
kwInput.addEventListener('keydown', e => { if (e.key === 'Enter') addKeyword(); });

function addKeyword() {
  const val = kwInput.value.trim();
  if (!val) return;
  if (state.keywords.some(k => k.text === val)) {
    kwInput.value = '';
    kwInput.placeholder = 'already exists!';
    setTimeout(() => { kwInput.placeholder = 'e.g. Tornado Shot, ads, spoiler...'; }, 1500);
    return;
  }
  state.keywords.push({ text: val, radius: 0 });
  kwInput.value = '';
  renderKeywords();
  saveState();
  syncToContent();
}

// Delegated: remove button
kwList.addEventListener('click', e => {
  const btn = e.target.closest('.kw-remove');
  if (!btn) return;
  const i = parseInt(btn.dataset.index, 10);
  state.keywords.splice(i, 1);
  renderKeywords();
  saveState();
  syncToContent();
});

// Delegated: radius slider
kwList.addEventListener('input', e => {
  const slider = e.target.closest('.kw-radius-slider');
  if (!slider) return;
  const i = parseInt(slider.dataset.index, 10);
  const v = parseInt(slider.value, 10);
  state.keywords[i].radius = v;

  // Live-update track fill
  const pct = (v / 6) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`;

  // Live-update badge
  const badge = kwList.querySelector(`[data-badge="${i}"]`);
  if (badge) {
    badge.textContent = v === 0 ? '0' : `+${v}`;
    badge.classList.toggle('zero', v === 0);
  }

  saveState();
  syncToContent();
});

clearAllBtn.addEventListener('click', () => {
  if (state.keywords.length === 0) return;
  state.keywords = [];
  renderKeywords();
  saveState();
  syncToContent();
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'COUNT_UPDATE') {
    state.filteredCount = msg.count;
    renderCount(state.filteredCount);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY]) {
    const s = stored[STORAGE_KEY];
    state.enabled  = s.enabled  ?? true;
    state.mode     = s.mode     ?? 'hide';
    // Migrate legacy string[] to object[]
    state.keywords = (s.keywords ?? []).map(k =>
      typeof k === 'string' ? { text: k, radius: 0 } : k
    );
  }
  renderAll();
  await fetchCount();
}

init();
