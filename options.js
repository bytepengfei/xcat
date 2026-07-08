const CUSTOM_KEYWORDS_STORAGE_KEY = "customSpamKeywords";
const KEYWORD_SUBSCRIPTION_URLS_STORAGE_KEY = "keywordSubscriptionUrls";
const SUBSCRIBED_KEYWORDS_STORAGE_KEY = "subscribedSpamKeywords";
const SHOW_COMMENT_PANEL_STORAGE_KEY = "showCommentPanel";
const form = document.getElementById("settings-form");
const keywordsInput = document.getElementById("keywords");
const subscriptionUrlsInput = document.getElementById("subscription-urls");
const subscriptionPreviewInput = document.getElementById("subscription-preview");
const syncSubscriptionsButton = document.getElementById("sync-subscriptions");
const showCommentPanelInput = document.getElementById("show-comment-panel");
const displayLanguageInput = document.getElementById("display-language");
const clearButton = document.getElementById("clear-keywords");
const statusText = document.getElementById("status");

function parseKeywords(value) {
  return parseLines(value, { ignoreComments: false });
}

function parseLines(value, { ignoreComments }) {
  const uniqueKeywords = new Map();

  for (const line of value.split(/\r?\n/)) {
    const keyword = line.trim();
    if (keyword && (!ignoreComments || !keyword.startsWith("#"))) {
      uniqueKeywords.set(keyword.toLocaleLowerCase(), keyword);
    }
  }

  return Array.from(uniqueKeywords.values());
}

function parseSubscriptionUrls(value) {
  return parseLines(value, { ignoreComments: true });
}

function getUrlOriginLabel(url) {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

async function fetchSubscriptionKeywords(url) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(XCatI18n.t("invalidUrl", { url }));
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(XCatI18n.t("unsupportedProtocol", { url }));
  }

  const response = await fetch(parsedUrl.href, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      XCatI18n.t("responseStatus", {
        origin: getUrlOriginLabel(url),
        status: response.status,
      }),
    );
  }

  return parseLines(await response.text(), { ignoreComments: true });
}

async function loadSettings() {
  const [syncStored, localStored] = await Promise.all([
    chrome.storage.sync.get([
      CUSTOM_KEYWORDS_STORAGE_KEY,
      KEYWORD_SUBSCRIPTION_URLS_STORAGE_KEY,
      SHOW_COMMENT_PANEL_STORAGE_KEY,
    ]),
    chrome.storage.local.get([SUBSCRIBED_KEYWORDS_STORAGE_KEY]),
  ]);
  const keywords = syncStored[CUSTOM_KEYWORDS_STORAGE_KEY];
  const subscriptionUrls =
    syncStored[KEYWORD_SUBSCRIPTION_URLS_STORAGE_KEY];
  const subscribedKeywords = localStored[SUBSCRIBED_KEYWORDS_STORAGE_KEY];
  keywordsInput.value = Array.isArray(keywords) ? keywords.join("\n") : "";
  subscriptionUrlsInput.value = Array.isArray(subscriptionUrls)
    ? subscriptionUrls.join("\n")
    : "";
  subscriptionPreviewInput.value = Array.isArray(subscribedKeywords)
    ? subscribedKeywords.join("\n")
    : "";
  showCommentPanelInput.checked =
    syncStored[SHOW_COMMENT_PANEL_STORAGE_KEY] !== false;
}

async function saveSettings() {
  const keywords = parseKeywords(keywordsInput.value);
  const subscriptionUrls = parseSubscriptionUrls(subscriptionUrlsInput.value);
  await chrome.storage.sync.set({
    [CUSTOM_KEYWORDS_STORAGE_KEY]: keywords,
    [KEYWORD_SUBSCRIPTION_URLS_STORAGE_KEY]: subscriptionUrls,
    [SHOW_COMMENT_PANEL_STORAGE_KEY]: showCommentPanelInput.checked,
  });
  keywordsInput.value = keywords.join("\n");
  subscriptionUrlsInput.value = subscriptionUrls.join("\n");
  statusText.textContent = XCatI18n.t("statusSaved", {
    keywordCount: keywords.length,
    subscriptionCount: subscriptionUrls.length,
  });
}

async function syncSubscriptions() {
  const subscriptionUrls = parseSubscriptionUrls(subscriptionUrlsInput.value);
  await chrome.storage.sync.set({
    [KEYWORD_SUBSCRIPTION_URLS_STORAGE_KEY]: subscriptionUrls,
  });
  subscriptionUrlsInput.value = subscriptionUrls.join("\n");

  const keywordMap = new Map();
  const failures = [];

  for (const url of subscriptionUrls) {
    try {
      const keywords = await fetchSubscriptionKeywords(url);
      for (const keyword of keywords) {
        keywordMap.set(keyword.toLocaleLowerCase(), keyword);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  const subscribedKeywords = Array.from(keywordMap.values());
  await chrome.storage.local.set({
    [SUBSCRIBED_KEYWORDS_STORAGE_KEY]: subscribedKeywords,
  });
  subscriptionPreviewInput.value = subscribedKeywords.join("\n");

  if (failures.length) {
    statusText.textContent = XCatI18n.t("statusSyncedWithFailures", {
      keywordCount: subscribedKeywords.length,
      failureCount: failures.length,
      failures: failures.join(
        XCatI18n.getCurrentLanguage() === "zh" ? "；" : "; ",
      ),
    });
    return;
  }

  statusText.textContent = XCatI18n.t("statusSynced", {
    keywordCount: subscribedKeywords.length,
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusText.textContent = XCatI18n.t("statusSaving");

  try {
    await saveSettings();
  } catch (error) {
    statusText.textContent = XCatI18n.t("statusSaveFailed");
  }
});

clearButton.addEventListener("click", async () => {
  keywordsInput.value = "";
  statusText.textContent = XCatI18n.t("statusSaving");

  try {
    await saveSettings();
  } catch (error) {
    statusText.textContent = XCatI18n.t("statusSaveFailed");
  }
});

syncSubscriptionsButton.addEventListener("click", async () => {
  syncSubscriptionsButton.disabled = true;
  statusText.textContent = XCatI18n.t("statusSyncing");

  try {
    await syncSubscriptions();
  } catch (error) {
    statusText.textContent = error instanceof Error
      ? XCatI18n.t("statusSyncFailedWithError", { message: error.message })
      : XCatI18n.t("statusSyncFailed");
  } finally {
    syncSubscriptionsButton.disabled = false;
  }
});

displayLanguageInput.addEventListener("change", async () => {
  await XCatI18n.save(displayLanguageInput.value);
  XCatI18n.apply();
  displayLanguageInput.value = XCatI18n.getCurrentPreference();
  statusText.textContent = XCatI18n.t("statusLanguageSaved");
});

async function initialize() {
  displayLanguageInput.value = await XCatI18n.load();
  XCatI18n.apply();
  displayLanguageInput.value = XCatI18n.getCurrentPreference();
  await loadSettings();
}

initialize().catch(() => {
  statusText.textContent = XCatI18n.t("statusLoadingFailed");
});
