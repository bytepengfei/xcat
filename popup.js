const CUSTOM_KEYWORDS_STORAGE_KEY = "customSpamKeywords";
const visitButton = document.getElementById("visit-x");
const settingsButton = document.getElementById("open-settings");
const quickAddForm = document.getElementById("quick-add-form");
const quickKeywordInput = document.getElementById("quick-keyword");
const quickAddButton = document.getElementById("quick-add-keyword");
const statusText = document.getElementById("status");

function getKeywords(value) {
  return Array.isArray(value)
    ? value.filter((keyword) => typeof keyword === "string" && keyword.trim())
    : [];
}

async function addKeyword(keyword) {
  const stored = await chrome.storage.sync.get([CUSTOM_KEYWORDS_STORAGE_KEY]);
  const keywords = getKeywords(stored[CUSTOM_KEYWORDS_STORAGE_KEY]);
  const normalizedKeyword = keyword.toLocaleLowerCase();

  if (
    keywords.some(
      (existingKeyword) =>
        existingKeyword.trim().toLocaleLowerCase() === normalizedKeyword,
    )
  ) {
    statusText.textContent = XCatI18n.t("quickKeywordExists", { keyword });
    return;
  }

  await chrome.storage.sync.set({
    [CUSTOM_KEYWORDS_STORAGE_KEY]: [...keywords, keyword],
  });
  quickKeywordInput.value = "";
  statusText.textContent = XCatI18n.t("quickKeywordAdded", { keyword });
}

visitButton.addEventListener("click", async () => {
  statusText.textContent = XCatI18n.t("openingX");

  try {
    await chrome.tabs.create({ url: "https://x.com/" });
    statusText.textContent = XCatI18n.t("openedX");
  } catch (error) {
    statusText.textContent = XCatI18n.t("openXFailed");
  }
});

settingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

quickAddForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const keyword = quickKeywordInput.value.trim();

  if (!keyword) {
    statusText.textContent = XCatI18n.t("quickKeywordEmpty");
    quickKeywordInput.focus();
    return;
  }

  quickAddButton.disabled = true;
  statusText.textContent = XCatI18n.t("quickKeywordAdding");

  try {
    await addKeyword(keyword);
  } catch {
    statusText.textContent = XCatI18n.t("quickKeywordAddFailed");
  } finally {
    quickAddButton.disabled = false;
  }
});

XCatI18n.load().then(() => {
  XCatI18n.apply();
});
