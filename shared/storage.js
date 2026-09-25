const TRANSLIGHT_DEFAULTS = { enabled: true, targetLang: "en" };

async function translightGetSettings() {
  const stored = await chrome.storage.sync.get(TRANSLIGHT_DEFAULTS);
  return { ...TRANSLIGHT_DEFAULTS, ...stored };
}

function translightSetEnabled(enabled) {
  return chrome.storage.sync.set({ enabled });
}

function translightSetTargetLang(targetLang) {
  return chrome.storage.sync.set({ targetLang });
}

function translightOnSettingsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    if (!("enabled" in changes) && !("targetLang" in changes)) return;
    callback({
      enabled: changes.enabled ? changes.enabled.newValue : undefined,
      targetLang: changes.targetLang ? changes.targetLang.newValue : undefined
    });
  });
}

self.TranslightStorage = {
  DEFAULTS: TRANSLIGHT_DEFAULTS,
  getSettings: translightGetSettings,
  setEnabled: translightSetEnabled,
  setTargetLang: translightSetTargetLang,
  onSettingsChanged: translightOnSettingsChanged
};
