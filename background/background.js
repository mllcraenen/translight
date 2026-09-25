import "../shared/storage.js";

const MAX_TEXT_LENGTH = 5000;

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(self.TranslightStorage.DEFAULTS);
  const toSet = {};
  if (stored.enabled === undefined) toSet.enabled = self.TranslightStorage.DEFAULTS.enabled;
  if (stored.targetLang === undefined) toSet.targetLang = self.TranslightStorage.DEFAULTS.targetLang;
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.sync.set(toSet);
  }
});

async function translate(text, targetLang) {
  const truncated =
    text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}…` : text;

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetLang);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", truncated);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Translate request failed: ${response.status}`);
  }

  const data = await response.json();
  const translated = data[0].map((segment) => segment[0]).join("");
  const detectedLang = data[2];

  return { translated, detectedLang };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "TRANSLATE") return false;

  translate(message.text, message.targetLang)
    .then(({ translated, detectedLang }) => {
      sendResponse({ ok: true, translated, detectedLang });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});
