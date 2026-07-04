const CUSTOM_KEYWORDS_STORAGE_KEY = "customSpamKeywords";
const form = document.getElementById("settings-form");
const keywordsInput = document.getElementById("keywords");
const clearButton = document.getElementById("clear-keywords");
const statusText = document.getElementById("status");

function parseKeywords(value) {
  const uniqueKeywords = new Map();

  for (const line of value.split(/\r?\n/)) {
    const keyword = line.trim();
    if (keyword) {
      uniqueKeywords.set(keyword.toLocaleLowerCase(), keyword);
    }
  }

  return Array.from(uniqueKeywords.values());
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(CUSTOM_KEYWORDS_STORAGE_KEY);
  const keywords = stored[CUSTOM_KEYWORDS_STORAGE_KEY];
  keywordsInput.value = Array.isArray(keywords) ? keywords.join("\n") : "";
}

async function saveSettings() {
  const keywords = parseKeywords(keywordsInput.value);
  await chrome.storage.sync.set({
    [CUSTOM_KEYWORDS_STORAGE_KEY]: keywords,
  });
  keywordsInput.value = keywords.join("\n");
  statusText.textContent = `已保存 ${keywords.length} 个自定义关键词。`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusText.textContent = "正在保存…";

  try {
    await saveSettings();
  } catch (error) {
    statusText.textContent = "保存失败，请重试。";
  }
});

clearButton.addEventListener("click", async () => {
  keywordsInput.value = "";
  statusText.textContent = "正在保存…";

  try {
    await saveSettings();
  } catch (error) {
    statusText.textContent = "保存失败，请重试。";
  }
});

loadSettings().catch(() => {
  statusText.textContent = "读取设置失败，请重新打开此页面。";
});
