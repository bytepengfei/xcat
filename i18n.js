(function () {
  const STORAGE_KEY = "displayLanguage";
  const DEFAULT_PREFERENCE = "auto";
  const SUPPORTED_LANGUAGES = new Set(["en", "zh"]);

  const messages = {
    en: {
      optionsTitle: "XCat settings",
      settingsHeading: "Keyword settings",
      settingsDescription:
        "Replies are muted when the comment, display name, or username contains any keyword.",
      displayLanguageLabel: "Display language",
      displayLanguageHint:
        "Auto follows Chrome's display language and falls back to English.",
      languageAuto: "Auto",
      languageEnglish: "English",
      languageChinese: "Chinese",
      commentPanelLabel: "Show right-side comments panel",
      commentPanelHint: "Filtering still runs when the panel is hidden.",
      customKeywordsLabel: "Custom keywords",
      customKeywordsPlaceholder: "Enter one keyword per line",
      customKeywordsHint:
        "One keyword per line, case-insensitive. No replies are marked when no keywords are configured.",
      subscriptionLabel: "Keyword subscriptions",
      syncSubscriptions: "Sync",
      subscriptionUrlsPlaceholder: "Enter one subscription URL per line",
      subscriptionUrlsHint:
        "Subscription content is parsed line by line. Blank lines and lines starting with # are ignored.",
      subscriptionPreviewLabel: "Subscription keyword preview",
      subscriptionPreviewPlaceholder:
        "Synced subscription keywords appear here",
      subscriptionPreviewHint:
        "Preview content comes from the latest sync and is used together with custom keywords.",
      saveSettings: "Save settings",
      clearKeywords: "Clear custom keywords",
      statusSaving: "Saving...",
      statusSaveFailed: "Save failed. Please try again.",
      statusLoadingFailed: "Could not load settings. Please reopen this page.",
      statusSyncing: "Syncing subscriptions...",
      statusSyncFailed: "Sync failed. Please try again.",
      statusSyncFailedWithError: "Sync failed: {message}",
      statusSaved:
        "Saved {keywordCount} custom keywords and {subscriptionCount} subscription URLs.",
      statusSynced: "Synced {keywordCount} subscription keywords.",
      statusSyncedWithFailures:
        "Synced {keywordCount} subscription keywords; {failureCount} URLs failed: {failures}",
      statusLanguageSaved: "Display language updated.",
      invalidUrl: "Invalid URL: {url}",
      unsupportedProtocol: "Only http/https is supported: {url}",
      responseStatus: "{origin} returned {status}",
      popupDescription: "Open X and filter unwanted replies on post pages.",
      visitX: "Visit x.com",
      openSettings: "Keyword settings",
      openingX: "Opening x.com...",
      openedX: "Cat is visiting X.",
      openXFailed: "Could not open x.com.",
    },
    zh: {
      optionsTitle: "XCat 设置",
      settingsHeading: "屏蔽关键词设置",
      settingsDescription:
        "评论、昵称或用户名中包含任一关键词时，该评论会被置灰标记。",
      displayLanguageLabel: "显示语言",
      displayLanguageHint: "自动模式跟随 Chrome 显示语言，不支持时默认英文。",
      languageAuto: "自动",
      languageEnglish: "英文",
      languageChinese: "中文",
      commentPanelLabel: "显示右侧评论浮窗",
      commentPanelHint: "关闭后仍会继续过滤垃圾评论。",
      customKeywordsLabel: "自定义关键词",
      customKeywordsPlaceholder: "每行输入一个关键词",
      customKeywordsHint:
        "每行一个关键词，不区分大小写。未配置关键词时不会自动标记垃圾回复。",
      subscriptionLabel: "关键词订阅",
      syncSubscriptions: "同步",
      subscriptionUrlsPlaceholder: "每行输入一个订阅链接",
      subscriptionUrlsHint:
        "订阅内容按行解析关键词，空行和以 # 开头的行会被忽略。",
      subscriptionPreviewLabel: "订阅关键词预览",
      subscriptionPreviewPlaceholder: "同步后在这里预览订阅关键词",
      subscriptionPreviewHint:
        "预览内容来自最近一次同步，会和自定义关键词一起用于标记垃圾回复。",
      saveSettings: "保存设置",
      clearKeywords: "清空自定义关键词",
      statusSaving: "正在保存...",
      statusSaveFailed: "保存失败，请重试。",
      statusLoadingFailed: "读取设置失败，请重新打开此页面。",
      statusSyncing: "正在同步订阅...",
      statusSyncFailed: "同步失败，请重试。",
      statusSyncFailedWithError: "同步失败：{message}",
      statusSaved:
        "已保存 {keywordCount} 个自定义关键词和 {subscriptionCount} 个订阅链接。",
      statusSynced: "已同步 {keywordCount} 个订阅关键词。",
      statusSyncedWithFailures:
        "已同步 {keywordCount} 个订阅关键词，{failureCount} 个链接失败：{failures}",
      statusLanguageSaved: "显示语言已更新。",
      invalidUrl: "无效链接：{url}",
      unsupportedProtocol: "仅支持 http/https：{url}",
      responseStatus: "{origin} 返回 {status}",
      popupDescription: "打开 X，并在帖子页面过滤垃圾回复。",
      visitX: "访问 x.com",
      openSettings: "屏蔽关键词设置",
      openingX: "正在打开 x.com...",
      openedX: "猫猫正在访问 X。",
      openXFailed: "无法打开 x.com。",
    },
  };

  let currentPreference = DEFAULT_PREFERENCE;
  let currentLanguage = resolveDisplayLanguage(currentPreference);

  function normalizePreference(preference) {
    return SUPPORTED_LANGUAGES.has(preference) ? preference : DEFAULT_PREFERENCE;
  }

  function getChromeLanguage() {
    const language =
      chrome.i18n && typeof chrome.i18n.getUILanguage === "function"
        ? chrome.i18n.getUILanguage()
        : navigator.language;
    const normalizedLanguage = String(language || "en").toLocaleLowerCase();

    if (normalizedLanguage.startsWith("zh")) {
      return "zh";
    }

    if (normalizedLanguage.startsWith("en")) {
      return "en";
    }

    return "en";
  }

  function resolveDisplayLanguage(preference) {
    const normalizedPreference = normalizePreference(preference);
    return normalizedPreference === DEFAULT_PREFERENCE
      ? getChromeLanguage()
      : normalizedPreference;
  }

  function translate(key, replacements = {}) {
    const dictionary = messages[currentLanguage] || messages.en;
    const template = dictionary[key] || messages.en[key] || key;

    return Object.entries(replacements).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      template,
    );
  }

  function apply(root = document) {
    document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";

    for (const element of root.querySelectorAll("[data-i18n]")) {
      element.textContent = translate(element.dataset.i18n);
    }

    for (const element of root.querySelectorAll("[data-i18n-placeholder]")) {
      element.placeholder = translate(element.dataset.i18nPlaceholder);
    }

    for (const element of root.querySelectorAll("[data-i18n-title]")) {
      element.title = translate(element.dataset.i18nTitle);
    }
  }

  async function load() {
    const stored = await chrome.storage.sync.get([STORAGE_KEY]);
    currentPreference = normalizePreference(stored[STORAGE_KEY]);
    currentLanguage = resolveDisplayLanguage(currentPreference);
    return currentPreference;
  }

  async function save(preference) {
    currentPreference = normalizePreference(preference);
    currentLanguage = resolveDisplayLanguage(currentPreference);
    await chrome.storage.sync.set({ [STORAGE_KEY]: currentPreference });
    return currentPreference;
  }

  window.XCatI18n = {
    apply,
    load,
    save,
    t: translate,
    getCurrentLanguage: () => currentLanguage,
    getCurrentPreference: () => currentPreference,
    normalizePreference,
    storageKey: STORAGE_KEY,
  };
})();
