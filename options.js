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
    throw new Error(`无效链接：${url}`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`仅支持 http/https：${url}`);
  }

  const response = await fetch(parsedUrl.href, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${getUrlOriginLabel(url)} 返回 ${response.status}`);
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
  statusText.textContent =
    `已保存 ${keywords.length} 个自定义关键词和 ${subscriptionUrls.length} 个订阅链接。`;
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
    statusText.textContent =
      `已同步 ${subscribedKeywords.length} 个订阅关键词，${failures.length} 个链接失败：${failures.join("；")}`;
    return;
  }

  statusText.textContent =
    `已同步 ${subscribedKeywords.length} 个订阅关键词。`;
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

syncSubscriptionsButton.addEventListener("click", async () => {
  syncSubscriptionsButton.disabled = true;
  statusText.textContent = "正在同步订阅…";

  try {
    await syncSubscriptions();
  } catch (error) {
    statusText.textContent =
      error instanceof Error ? `同步失败：${error.message}` : "同步失败，请重试。";
  } finally {
    syncSubscriptionsButton.disabled = false;
  }
});

loadSettings().catch(() => {
  statusText.textContent = "读取设置失败，请重新打开此页面。";
});
