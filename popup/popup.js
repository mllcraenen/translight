(async () => {
  const select = document.getElementById("target-lang");
  const toggle = document.getElementById("enabled-toggle");

  for (const { code, label } of self.TranslightLanguages) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = label;
    select.appendChild(option);
  }

  const settings = await self.TranslightStorage.getSettings();
  select.value = settings.targetLang;
  toggle.checked = settings.enabled;

  select.addEventListener("change", () => {
    self.TranslightStorage.setTargetLang(select.value);
  });

  toggle.addEventListener("change", () => {
    self.TranslightStorage.setEnabled(toggle.checked);
  });
})();
