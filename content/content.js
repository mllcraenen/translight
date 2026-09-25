(() => {
  let enabled = true;
  let targetLang = "en";
  let lastShownText = "";
  let hideTimeoutId = null;

  self.TranslightStorage.getSettings().then((settings) => {
    enabled = settings.enabled;
    targetLang = settings.targetLang;
  });

  self.TranslightStorage.onSettingsChanged(({ enabled: newEnabled, targetLang: newTargetLang }) => {
    if (newEnabled !== undefined) {
      enabled = newEnabled;
      if (!enabled) hideBox();
    }
    if (newTargetLang !== undefined) targetLang = newTargetLang;
  });

  let host = null;
  let shadow = null;
  let boxEl = null;

  function ensureBox() {
    if (host) return;
    host = document.createElement("div");
    host.id = "translight-host";
    document.body.appendChild(host);
    shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .box {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        line-height: 1.4;
        background: #2b2b2b;
        color: #f5f5f5;
        padding: 6px 10px;
        border-radius: 8px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        max-width: 320px;
        pointer-events: auto;
        user-select: text;
      }
      .box.error {
        color: #ff9b9b;
      }
      .box.loading {
        opacity: 0.7;
        font-style: italic;
      }
    `;
    shadow.appendChild(style);

    boxEl = document.createElement("div");
    boxEl.className = "box";
    shadow.appendChild(boxEl);
  }

  function showBox(rect, content, { loading = false, error = false } = {}) {
    ensureBox();
    boxEl.textContent = content;
    boxEl.classList.toggle("loading", loading);
    boxEl.classList.toggle("error", error);
    host.style.display = "block";

    // Measure after content is set so offsetWidth/offsetHeight are accurate.
    const boxWidth = boxEl.offsetWidth || 200;
    const boxHeight = boxEl.offsetHeight || 30;

    let top = rect.top - boxHeight - 8;
    let placedBelow = false;
    if (top < 4) {
      top = rect.bottom + 8;
      placedBelow = true;
    }

    let left = rect.left + rect.width / 2 - boxWidth / 2;
    left = Math.max(4, Math.min(left, window.innerWidth - boxWidth - 4));
    top = Math.max(4, Math.min(top, window.innerHeight - boxHeight - 4));

    host.style.top = `${top}px`;
    host.style.left = `${left}px`;
    void placedBelow; // reserved for future styling of the flip direction
  }

  function hideBox() {
    if (host) host.style.display = "none";
    lastShownText = "";
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
  }

  function isInsideBox(target) {
    return host && host.contains(target);
  }

  async function handleSelection(rect, text) {
    showBox(rect, "…", { loading: true });

    if (hideTimeoutId) clearTimeout(hideTimeoutId);
    hideTimeoutId = setTimeout(() => {
      showBox(rect, "Translation failed", { error: true });
    }, 8000);

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: "TRANSLATE",
        text,
        targetLang
      });
    } catch (err) {
      response = { ok: false, error: err.message };
    }

    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }

    if (lastShownText !== text) return; // selection moved on while we waited

    if (response?.ok) {
      showBox(rect, response.translated);
    } else {
      showBox(rect, "Translation failed", { error: true });
    }
  }

  document.addEventListener("mouseup", (event) => {
    if (!enabled) return;
    if (isInsideBox(event.target)) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text) return;

    if (text === lastShownText && host && host.style.display !== "none") return;

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    lastShownText = text;
    handleSelection(rect, text);
  });

  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      hideBox();
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (!isInsideBox(event.target)) hideBox();
  });

  window.addEventListener("scroll", hideBox, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideBox();
  });
})();
