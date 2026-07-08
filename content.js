const COMMENT_PANEL_ID = "cat-visit-x-comments";
const COMMENT_PANEL_STYLE_ID = "cat-visit-x-comments-style";
const MODERATION_BUTTON_ID = "cat-visit-x-moderation-button";
const MODERATION_MODAL_ID = "cat-visit-x-moderation-modal";
const BLOCK_TOAST_ID = "cat-visit-x-block-toast";
const QUICK_BLOCK_BUTTON_CLASS = "cat-visit-x-quick-block";
const QUICK_BLOCK_MORE_BUTTON_CLASS = "cat-visit-x-quick-block-more";
const STYLE_ID = "cat-visit-x-style";
const STATUS_PAGE_PATTERN = /^\/[^/]+\/status\/\d+/;
const CUSTOM_KEYWORDS_STORAGE_KEY = "customSpamKeywords";
const SUBSCRIBED_KEYWORDS_STORAGE_KEY = "subscribedSpamKeywords";
const SHOW_COMMENT_PANEL_STORAGE_KEY = "showCommentPanel";
let customSpamKeywords = [];
let subscribedSpamKeywords = [];
let showCommentPanel = true;
let commentStore = new Map();
let foldedCommentStore = new Map();
let markedSpamNodeStore = new Map();
let storedStatusId = "";
let autoScanTimer = 0;
let autoScanLastCount = 0;
let autoScanIdleRounds = 0;
let blockExecutionChain = Promise.resolve();
const blockingUsernames = new Set();
const blockInteractionCommentIds = new Set();

function isStatusPage() {
  return STATUS_PAGE_PATTERN.test(window.location.pathname);
}

function getStatusId() {
  const match = window.location.pathname.match(/\/status\/(\d+)/);
  return match ? match[1] : "";
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${MODERATION_BUTTON_ID} {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 2;
      display: grid;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: var(--cat-visit-x-search-height, 44px);
      height: var(--cat-visit-x-search-height, 44px);
      margin: 0;
      border: 1px solid rgb(51, 54, 57);
      border-radius: 50%;
      padding: 0;
      color: #202124;
      background: #f7b267;
      cursor: pointer;
    }

    .cat-visit-x-search-host {
      position: relative !important;
      box-sizing: border-box !important;
      padding-right: calc(var(--cat-visit-x-search-height, 44px) + 8px) !important;
    }

    #${MODERATION_BUTTON_ID} .cat-icon {
      position: relative;
      display: block;
      box-sizing: border-box;
      width: 23px;
      height: 20px;
      margin-top: 4px;
      border: 2px solid currentColor;
      border-radius: 8px;
    }

    #${MODERATION_BUTTON_ID} .cat-icon::before,
    #${MODERATION_BUTTON_ID} .cat-icon::after {
      position: absolute;
      top: -7px;
      width: 8px;
      height: 8px;
      border-top: 2px solid currentColor;
      content: "";
    }

    #${MODERATION_BUTTON_ID} .cat-icon::before {
      left: 1px;
      border-left: 2px solid currentColor;
      transform: rotate(18deg);
    }

    #${MODERATION_BUTTON_ID} .cat-icon::after {
      right: 1px;
      border-right: 2px solid currentColor;
      transform: rotate(-18deg);
    }

    #${MODERATION_BUTTON_ID} .cat-visit-x-count-badge {
      position: absolute;
      top: -7px;
      right: -7px;
      display: grid;
      place-items: center;
      box-sizing: border-box;
      min-width: 20px;
      height: 20px;
      border: 2px solid rgb(0, 0, 0);
      border-radius: 999px;
      padding: 0 5px;
      color: #fff;
      background: #f4212e;
      font: 700 11px/1 Arial, Helvetica, sans-serif;
      pointer-events: none;
    }

    #${MODERATION_BUTTON_ID}:hover {
      background: #f5a94e;
    }

    #${MODERATION_BUTTON_ID}:focus-visible {
      outline: 2px solid #1d9bf0;
      outline-offset: 2px;
    }

    .cat-visit-x-muted-spam-cell {
      opacity: 0.38 !important;
      filter: grayscale(1) saturate(0.35) !important;
      transition: opacity 160ms ease, filter 160ms ease !important;
    }

    .cat-visit-x-muted-spam-cell:hover,
    .cat-visit-x-muted-spam-cell:focus-within {
      opacity: 0.68 !important;
    }

    #${MODERATION_MODAL_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(91, 112, 131, 0.4);
      font: 14px/1.4 Arial, Helvetica, sans-serif;
    }

    #${MODERATION_MODAL_ID}[hidden] {
      display: none;
    }

    #${MODERATION_MODAL_ID} .dialog {
      width: min(720px, 100%);
      max-height: min(720px, calc(100vh - 48px));
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      overflow: hidden;
      border: 1px solid #2f3336;
      border-radius: 16px;
      color: #e7e9ea;
      background: #000;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
    }

    #${MODERATION_MODAL_ID} header,
    #${MODERATION_MODAL_ID} footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid #2f3336;
    }

    #${MODERATION_MODAL_ID} footer {
      border-top: 1px solid #2f3336;
      border-bottom: 0;
    }

    #${MODERATION_MODAL_ID} h2 {
      margin: 0;
      font-size: 20px;
      line-height: 1.2;
    }

    #${MODERATION_MODAL_ID} [data-role="modal-summary"] {
      margin: 0;
      padding: 12px 18px;
      color: #71767b;
      border-bottom: 1px solid #2f3336;
    }

    #${MODERATION_MODAL_ID} [data-role="modal-list"] {
      display: grid;
      gap: 0;
      overflow: auto;
    }

    #${MODERATION_MODAL_ID} label {
      display: grid;
      grid-template-columns: 22px 1fr;
      gap: 10px;
      padding: 12px 18px;
      border-bottom: 1px solid #2f3336;
      cursor: pointer;
    }

    #${MODERATION_MODAL_ID} label:hover {
      background: #080808;
    }

    #${MODERATION_MODAL_ID} input {
      margin-top: 3px;
      accent-color: #1d9bf0;
    }

    #${MODERATION_MODAL_ID} .user {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 4px;
      font-weight: 700;
    }

    #${MODERATION_MODAL_ID} .username,
    #${MODERATION_MODAL_ID} .reason {
      color: #71767b;
      font-weight: 400;
    }

    #${MODERATION_MODAL_ID} .comment {
      color: #e7e9ea;
      word-break: break-word;
    }

    #${MODERATION_MODAL_ID} button {
      min-height: 34px;
      border: 0;
      border-radius: 999px;
      padding: 0 14px;
      color: #fff;
      background: #1d9bf0;
      font: 700 13px/1 Arial, Helvetica, sans-serif;
      cursor: pointer;
    }

    #${MODERATION_MODAL_ID} [data-action="close"] {
      color: #e7e9ea;
      background: #202327;
    }

    #${MODERATION_MODAL_ID} [data-action="prepare-block"],
    #${MODERATION_MODAL_ID} [data-action="confirm-block"] {
      background: #f4212e;
    }

    #${MODERATION_MODAL_ID} button:disabled {
      opacity: 0.55;
      cursor: default;
    }

    .${QUICK_BLOCK_BUTTON_CLASS} {
      position: relative;
      display: inline-grid;
      place-items: center;
      box-sizing: border-box;
      width: 34px;
      height: 34px;
      margin: 0;
      border: 0;
      border-radius: 50%;
      padding: 0;
      color: rgb(113, 118, 123);
      background: transparent;
      cursor: pointer;
    }

    .${QUICK_BLOCK_BUTTON_CLASS}:hover {
      color: rgb(244, 33, 46);
      background: rgba(244, 33, 46, 0.1);
    }

    .${QUICK_BLOCK_BUTTON_CLASS}:focus-visible {
      outline: 2px solid #1d9bf0;
      outline-offset: 1px;
    }

    .${QUICK_BLOCK_BUTTON_CLASS}:disabled {
      cursor: wait;
      opacity: 0.55;
    }

    .${QUICK_BLOCK_BUTTON_CLASS} .x-block-icon {
      display: block;
      box-sizing: border-box;
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .${QUICK_BLOCK_MORE_BUTTON_CLASS} {
      box-sizing: border-box !important;
      display: inline-grid !important;
      place-items: center !important;
      width: 34px !important;
      height: 34px !important;
      min-width: 34px !important;
      min-height: 34px !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .${QUICK_BLOCK_MORE_BUTTON_CLASS} > div {
      display: grid !important;
      place-items: center !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
    }

    .${QUICK_BLOCK_MORE_BUTTON_CLASS} svg {
      display: block !important;
      margin: 0 !important;
    }

    #${BLOCK_TOAST_ID} {
      position: fixed;
      top: 18px;
      left: 50%;
      z-index: 2147483646;
      max-width: min(520px, calc(100vw - 32px));
      border-radius: 999px;
      padding: 10px 16px;
      color: #e7e9ea;
      background: #202327;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
      font: 700 13px/18px Arial, Helvetica, sans-serif;
      text-align: center;
      transform: translateX(-50%);
    }

    #${BLOCK_TOAST_ID}[data-kind="error"] {
      background: #8b111b;
    }
  `;

  document.documentElement.append(style);
}

function getCommentId(article) {
  const statusLink = Array.from(
    article.querySelectorAll('a[href*="/status/"]'),
  ).find((link) => {
    const href = link.getAttribute("href") || "";
    return /\/status\/\d+/.test(href);
  });

  if (statusLink) {
    return statusLink.href;
  }

  return normalizeText(article.innerText).slice(0, 160);
}

function getUserInfo(article) {
  const userNameBlock = article.querySelector('[data-testid="User-Name"]');
  const profileLink = Array.from(article.querySelectorAll('a[href^="/"]')).find(
    (link) => {
      const href = link.getAttribute("href") || "";
      return /^\/[A-Za-z0-9_]+$/.test(href);
    },
  );
  const avatar = article.querySelector('img[src*="profile_images"]');
  const usernameFromLink = profileLink
    ? `@${profileLink.getAttribute("href").slice(1)}`
    : "";
  const usernameText = userNameBlock
    ? Array.from(userNameBlock.querySelectorAll("span"))
        .map((span) => normalizeText(span.textContent || ""))
        .find((text) => /^@[A-Za-z0-9_]+$/.test(text))
    : "";
  const nickname = userNameBlock
    ? normalizeText(userNameBlock.querySelector("span")?.textContent || "")
    : "";
  const visibleUserText = userNameBlock
    ? normalizeText(userNameBlock.innerText || userNameBlock.textContent || "")
    : "";
  const badgeLabels = userNameBlock
    ? Array.from(userNameBlock.querySelectorAll("[aria-label], [title]"))
        .map((element) =>
          normalizeText(
            `${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`,
          ),
        )
        .filter(Boolean)
    : [];
  const verifiedLabel =
    badgeLabels.find((label) => /verified|premium|subscribe/i.test(label)) ||
    "";
  const isPremiumPlus = badgeLabels.some((label) =>
    /premium\s*\+/i.test(label),
  );
  const hasPremiumLabel = badgeLabels.some((label) => /premium/i.test(label));
  const isVerified = badgeLabels.some((label) => /verified/i.test(label));

  return {
    nickname,
    username: usernameText || usernameFromLink,
    profileUrl: profileLink
      ? new URL(profileLink.getAttribute("href"), window.location.origin).href
      : "",
    avatarUrl: avatar ? avatar.src : "",
    userNameBlockText: visibleUserText,
    badgeLabels,
    verifiedLabel,
    isVerified,
    isPremium:
      hasPremiumLabel ||
      (isVerified && /verified account/i.test(verifiedLabel)),
    isPremiumPlus,
  };
}

function getCommentContent(article) {
  const tweetText = article.querySelector('[data-testid="tweetText"]');
  if (!tweetText) {
    return "";
  }

  const text = normalizeText(
    tweetText.innerText || tweetText.textContent || "",
  );
  const mediaLabels = Array.from(
    tweetText.querySelectorAll("img[alt], [aria-label]"),
  )
    .map((element) =>
      normalizeText(
        element.getAttribute("alt") || element.getAttribute("aria-label") || "",
      ),
    )
    .filter(Boolean);

  return normalizeText([text, ...mediaLabels].join(" "));
}

function detectSpam(comment) {
  const searchableText = [
    comment.nickname,
    comment.username,
    comment.userInfo?.userNameBlockText,
    comment.content,
    comment.rawArticleText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const reasons = [];

  for (const keyword of [...customSpamKeywords, ...subscribedSpamKeywords]) {
    if (searchableText.includes(keyword.toLowerCase())) {
      reasons.push(`keyword:${keyword}`);
    }
  }

  return {
    isSpam: reasons.length > 0,
    reasons,
  };
}

function buildCommentFromArticle(article) {
  const userInfo = getUserInfo(article);
  const content = getCommentContent(article);
  const id = getCommentId(article);
  const rawArticleText = normalizeText(
    article.innerText || article.textContent || "",
  );
  const comment = {
    id,
    nickname: userInfo.nickname,
    username: userInfo.username,
    userInfo,
    content,
    rawArticleText,
  };
  const spam = detectSpam(comment);

  return {
    ...comment,
    isSpam: spam.isSpam,
    spamReasons: spam.reasons,
  };
}

function collectVisibleComments() {
  return getVisibleCommentEntries().map(({ comment }) => comment);
}

function getVisibleCommentEntries() {
  if (!isStatusPage()) {
    return [];
  }

  const main = document.querySelector("main") || document;
  const articles = Array.from(
    main.querySelectorAll('article[data-testid="tweet"]'),
  );
  const originalStatusId = getStatusId();

  return articles
    .slice(1)
    .map((article) => {
      const comment = buildCommentFromArticle(article);

      return {
        article,
        comment,
      };
    })
    .filter(({ comment }) => {
      if (!comment.nickname && !comment.username) {
        return false;
      }

      if (!comment.content && !comment.isSpam) {
        return false;
      }

      return originalStatusId
        ? !comment.id.includes(`/status/${originalStatusId}`)
        : true;
    })
    .filter(({ article }) => isCurrentConversationReply(article));
}

function isCurrentConversationReply(article) {
  const timeline = getConversationTimeline();
  if (!timeline) {
    return true;
  }

  const cell = article.closest('[data-testid="cellInnerDiv"]') || article;
  let timelineChild = cell;
  while (timelineChild.parentElement && timelineChild.parentElement !== timeline) {
    timelineChild = timelineChild.parentElement;
  }

  for (const child of Array.from(timeline.children)) {
    if (child === timelineChild) {
      return true;
    }

    const text = normalizeText(child.innerText || child.textContent || "");
    if (/^Discover more\b/i.test(text)) {
      return false;
    }
  }

  return true;
}

function isUsableMenuCandidate(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.closest(`.${QUICK_BLOCK_BUTTON_CLASS}`)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getElementLabel(element) {
  return normalizeText(
    element.getAttribute("aria-label") ||
      element.innerText ||
      element.textContent ||
      "",
  );
}

function getSmallestMatchingCandidate(candidates, pattern) {
  return (
    candidates.find(
      (element) =>
        !Array.from(element.children).some((child) =>
          pattern.test(getElementLabel(child)),
        ),
    ) || null
  );
}

function getClickableTarget(element, pattern) {
  let target = element;
  let clickableTarget = null;

  while (target) {
    if (
      !clickableTarget &&
      target instanceof HTMLElement &&
      (target.matches(
        'button, [role="menuitem"], [role="button"], [tabindex="0"]',
      ) ||
        getComputedStyle(target).cursor === "pointer")
    ) {
      clickableTarget = target;
    }

    if (!target.parentElement) {
      break;
    }

    const parentText = getElementLabel(target.parentElement);
    if (!pattern.test(parentText)) {
      break;
    }

    target = target.parentElement;
  }

  return clickableTarget || element;
}

function pressEscape() {
  const eventOptions = {
    bubbles: true,
    cancelable: true,
    composed: true,
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
  };
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
  document.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
  window.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
}

function closeOpenXMenus() {
  pressEscape();
}

function canCollapseSpamNode(node, article) {
  if (!node || node === document.body || node === document.documentElement) {
    return false;
  }

  if (
    node.matches(
      "main, aside, section, [data-testid='primaryColumn'], [data-testid='sidebarColumn']",
    )
  ) {
    return false;
  }

  const ariaLabel = node.getAttribute("aria-label") || "";
  if (/timeline|conversation|primary|trending/i.test(ariaLabel)) {
    return false;
  }

  const articles =
    node.querySelectorAll?.('article[data-testid="tweet"]') || [];
  if (
    articles.length > 1 ||
    (articles.length === 1 && articles[0] !== article)
  ) {
    return false;
  }

  const articleHeight = Math.max(article.getBoundingClientRect().height, 1);
  const nodeHeight = node.getBoundingClientRect().height;
  return nodeHeight > 0 && nodeHeight <= Math.max(articleHeight + 220, 900);
}

function getSpamCollapseNodes(article) {
  const nodes = [];
  const timelineCell = article.closest('[data-testid="cellInnerDiv"]');

  for (
    let node = article;
    node && node !== document.body;
    node = node.parentElement
  ) {
    if (!canCollapseSpamNode(node, article)) {
      if (node === timelineCell || nodes.length > 0) {
        break;
      }
      continue;
    }

    nodes.push(node);

    if (
      node.parentElement?.matches(
        "[aria-label*='Timeline'], [data-testid='primaryColumn']",
      )
    ) {
      break;
    }
  }

  return nodes.length ? nodes : [timelineCell || article];
}

function getConversationTimeline() {
  return document.querySelector(
    '[aria-label="Timeline: Conversation"], [aria-label*="Timeline: Conversation"]',
  );
}

function clearConversationHeightTrim() {
  const timeline = getConversationTimeline();
  timeline?.style.removeProperty("max-height");
  timeline?.style.removeProperty("overflow");
}

function markSpamCommentArticle(article, comment) {
  if (!comment.isSpam || blockInteractionCommentIds.has(comment.id)) {
    return;
  }

  foldedCommentStore.set(comment.id, comment);
  const previousNodes = markedSpamNodeStore.get(comment.id) || [];
  const nodes = getSpamCollapseNodes(article);
  const currentNodeSet = new Set(nodes);
  for (const node of previousNodes) {
    if (!currentNodeSet.has(node)) {
      node.classList.remove("cat-visit-x-muted-spam-cell");
      node.classList.remove("cat-visit-x-hidden-spam-cell");
    }
  }
  markedSpamNodeStore.set(comment.id, nodes);
  for (const node of nodes) {
    node.classList.remove("cat-visit-x-hidden-spam-cell");
    node.classList.add("cat-visit-x-muted-spam-cell");
  }
}

function restoreCommentArticle(comment, article) {
  const nodes = [
    ...(markedSpamNodeStore.get(comment.id) || []),
    ...(article ? getSpamCollapseNodes(article) : []),
  ];

  for (const node of nodes) {
    node.classList.remove("cat-visit-x-muted-spam-cell");
    node.classList.remove("cat-visit-x-hidden-spam-cell");
  }
  markedSpamNodeStore.delete(comment.id);
  foldedCommentStore.delete(comment.id);
}

function processVisibleSpam() {
  for (const { article, comment } of getVisibleCommentEntries()) {
    commentStore.set(comment.id, comment);
    upsertQuickBlockButton(article, comment);
    if (comment.isSpam) {
      markSpamCommentArticle(article, comment);
    } else {
      restoreCommentArticle(comment, article);
    }
  }
  clearConversationHeightTrim();
}

function showBlockToast(message, kind = "info", duration = 3200) {
  let toast = document.getElementById(BLOCK_TOAST_ID);
  if (!toast) {
    toast = document.createElement("div");
    toast.id = BLOCK_TOAST_ID;
    toast.setAttribute("role", "status");
    document.documentElement.append(toast);
  }

  toast.dataset.kind = kind;
  toast.textContent = message;
  window.clearTimeout(Number(toast.dataset.timer || 0));
  if (duration > 0) {
    const timer = window.setTimeout(() => toast.remove(), duration);
    toast.dataset.timer = String(timer);
  }
}

function getArticleForComment(comment) {
  return Array.from(
    document.querySelectorAll('article[data-testid="tweet"]'),
  ).find((article) => getCommentId(article) === comment.id);
}

function waitForElement(getElement, timeout = 5000) {
  const existing = getElement();
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const element = getElement();
      if (element) {
        window.clearTimeout(timer);
        observer.disconnect();
        resolve(element);
      }
    });
    const timer = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timed out waiting for X controls."));
    }, timeout);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

function waitForBlockBatchInterval() {
  const delay = 700 + Math.random() * 600;
  return new Promise((resolve) => {
    window.setTimeout(resolve, delay);
  });
}

function findMenuItem(pattern, testId) {
  const byTestId = testId
    ? Array.from(document.querySelectorAll(`[data-testid="${testId}"]`)).find(
        (element) => {
          if (!isUsableMenuCandidate(element)) {
            return false;
          }
          const label = getElementLabel(element);
          return !label || pattern.test(label);
        },
      )
    : null;
  if (byTestId) {
    return byTestId;
  }

  const candidates = Array.from(
    document.querySelectorAll(
      '[role="menuitem"], [role="dialog"] button, [aria-label], body div, body span',
    ),
  ).filter(
    (element) =>
      isUsableMenuCandidate(element) && pattern.test(getElementLabel(element)),
  );
  const target = getSmallestMatchingCandidate(candidates, pattern);
  return target ? getClickableTarget(target, pattern) : null;
}

function activateElement(element) {
  const eventOptions = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    button: 0,
  };
  element.dispatchEvent(new PointerEvent("pointerdown", eventOptions));
  element.dispatchEvent(new MouseEvent("mousedown", eventOptions));
  element.dispatchEvent(new PointerEvent("pointerup", eventOptions));
  element.dispatchEvent(new MouseEvent("mouseup", eventOptions));
  element.click();
}

function revealCommentForBlock(article, comment) {
  blockInteractionCommentIds.add(comment.id);
  const nodes =
    markedSpamNodeStore.get(comment.id) || getSpamCollapseNodes(article);
  for (const node of nodes) {
    node.classList.remove("cat-visit-x-muted-spam-cell");
    node.classList.remove("cat-visit-x-hidden-spam-cell");
  }
}

function markBlockedUserComments(username) {
  const normalizedUsername = username.toLowerCase();
  for (const [id, comment] of commentStore) {
    if (comment.username.toLowerCase() !== normalizedUsername) {
      continue;
    }

    const article = getArticleForComment(comment);
    if (article) {
      const nodes = getSpamCollapseNodes(article);
      markedSpamNodeStore.set(id, nodes);
      for (const node of nodes) {
        node.classList.remove("cat-visit-x-hidden-spam-cell");
        node.classList.add("cat-visit-x-muted-spam-cell");
      }
    }
    foldedCommentStore.delete(id);
  }
  clearConversationHeightTrim();
  upsertModerationButton();
}

async function blockUserThroughX(comment) {
  const username = comment.username;
  if (!username) {
    throw new Error("This reply has no username.");
  }

  const article = getArticleForComment(comment);
  if (!article) {
    throw new Error("The reply is no longer loaded.");
  }

  revealCommentForBlock(article, comment);
  article.scrollIntoView({ block: "center", behavior: "auto" });

  try {
    closeOpenXMenus();
    const menuButton = article.querySelector('[data-testid="caret"]');
    if (!menuButton) {
      throw new Error("X More menu was not found.");
    }

    activateElement(menuButton);
    const escapedUsername = escapeRegExp(username);
    const blockPattern = new RegExp(
      `^(block|屏蔽|封锁|ブロック)\\s+${escapedUsername}(\\b|$)`,
      "i",
    );
    const blockItem = await waitForElement(() =>
      findMenuItem(blockPattern, "block"),
    );
    activateElement(blockItem);

    const confirmButton = await waitForElement(() =>
      findMenuItem(
        /^(block|屏蔽|封锁|ブロック)$/i,
        "confirmationSheetConfirm",
      ),
    );
    activateElement(confirmButton);

    await waitForElement(
      () => (!document.documentElement.contains(confirmButton) ? document.body : null),
    );
    markBlockedUserComments(username);
    closeOpenXMenus();
    return { username, ok: true };
  } catch (error) {
    closeOpenXMenus();
    throw error;
  } finally {
    blockInteractionCommentIds.delete(comment.id);
  }
}

function enqueueBlock(comment) {
  const username = comment.username.toLowerCase();
  if (blockingUsernames.has(username)) {
    return Promise.resolve({
      username: comment.username,
      ok: false,
      error: "Already being blocked.",
    });
  }

  blockingUsernames.add(username);
  const operation = blockExecutionChain.then(async () => {
    try {
      return await blockUserThroughX(comment);
    } catch (error) {
      return {
        username: comment.username,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      blockingUsernames.delete(username);
    }
  });
  blockExecutionChain = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

function createQuickBlockIcon() {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  icon.classList.add("x-block-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  path.setAttribute(
    "d",
    "M12 3.75c-4.55 0-8.25 3.69-8.25 8.25 0 1.92.66 3.68 1.75 5.08L17.09 5.5C15.68 4.4 13.92 3.75 12 3.75zm6.5 3.17L6.92 18.5c1.4 1.1 3.16 1.75 5.08 1.75 4.56 0 8.25-3.69 8.25-8.25 0-1.92-.65-3.68-1.75-5.08zM1.75 12C1.75 6.34 6.34 1.75 12 1.75S22.25 6.34 22.25 12 17.66 22.25 12 22.25 1.75 17.66 1.75 12z",
  );
  group.append(path);
  icon.append(group);
  return icon;
}

function upsertQuickBlockButton(article, comment) {
  const currentUsername = normalizeText(
    document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')
      ?.innerText || "",
  )
    .split(" ")
    .find((text) => /^@[A-Za-z0-9_]+$/.test(text));
  if (
    !comment.username ||
    comment.username.toLowerCase() === currentUsername?.toLowerCase() ||
    article.querySelector(`.${QUICK_BLOCK_BUTTON_CLASS}`)
  ) {
    return;
  }

  const menuButton = article.querySelector('[data-testid="caret"]');
  if (!menuButton?.parentElement) {
    return;
  }

  menuButton.classList.add(QUICK_BLOCK_MORE_BUTTON_CLASS);

  const button = document.createElement("button");
  button.type = "button";
  button.className = QUICK_BLOCK_BUTTON_CLASS;
  button.dataset.commentId = comment.id;
  button.setAttribute("aria-label", `Block ${comment.username}`);
  button.title = `Block ${comment.username}`;
  button.append(createQuickBlockIcon());
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) {
      return;
    }

    button.disabled = true;
    showBlockToast(`Blocking ${comment.username}…`, "info", 0);
    const result = await enqueueBlock(comment);
    if (result.ok) {
      showBlockToast(`Blocked ${comment.username}.`);
      return;
    }

    button.disabled = false;
    showBlockToast(
      `Could not block ${comment.username}: ${result.error}`,
      "error",
      5000,
    );
  });

  menuButton.parentElement.insertBefore(button, menuButton);
}

function upsertPanel() {
  let panel = document.getElementById(COMMENT_PANEL_ID);

  if (panel) {
    return panel;
  }

  panel = document.createElement("section");
  panel.id = COMMENT_PANEL_ID;
  panel.innerHTML = `
    <header>
      <strong>X comments</strong>
      <div class="actions">
        <button type="button" data-action="scan">Auto Scan</button>
        <button type="button" data-action="copy">Copy JSON</button>
      </div>
    </header>
    <p data-role="summary">Reading comments...</p>
    <ol data-role="list"></ol>
  `;

  const style =
    document.getElementById(COMMENT_PANEL_STYLE_ID) ||
    document.createElement("style");
  style.id = COMMENT_PANEL_STYLE_ID;
  style.textContent = `
    #${COMMENT_PANEL_ID} {
      position: fixed;
      top: 84px;
      right: 18px;
      z-index: 2147483647;
      box-sizing: border-box;
      width: min(360px, calc(100vw - 36px));
      max-height: min(620px, calc(100vh - 120px));
      border: 1px solid rgba(15, 20, 25, 0.18);
      border-radius: 8px;
      overflow: hidden;
      color: #0f1419;
      background: #fff;
      box-shadow: 0 16px 44px rgba(15, 20, 25, 0.2);
      font: 13px/1.4 Arial, Helvetica, sans-serif;
    }

    #${COMMENT_PANEL_ID} header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(15, 20, 25, 0.1);
      background: #f7f9f9;
    }

    #${COMMENT_PANEL_ID} .actions {
      display: flex;
      gap: 8px;
    }

    #${COMMENT_PANEL_ID} button {
      min-height: 30px;
      border: 0;
      border-radius: 6px;
      padding: 0 10px;
      color: #fff;
      background: #0f1419;
      font: 700 12px/1 Arial, Helvetica, sans-serif;
      cursor: pointer;
    }

    #${COMMENT_PANEL_ID} [data-role="summary"] {
      margin: 0;
      padding: 9px 12px;
      color: #536471;
      border-bottom: 1px solid rgba(15, 20, 25, 0.08);
    }

    #${COMMENT_PANEL_ID} [data-role="list"] {
      display: grid;
      gap: 0;
      max-height: 500px;
      margin: 0;
      padding: 0;
      overflow: auto;
      list-style: none;
    }

    #${COMMENT_PANEL_ID} li {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(15, 20, 25, 0.08);
    }

    #${COMMENT_PANEL_ID} .meta {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
      font-weight: 700;
    }

    #${COMMENT_PANEL_ID} .username {
      color: #536471;
      font-weight: 400;
    }

    #${COMMENT_PANEL_ID} .premium {
      color: #1d9bf0;
      font-weight: 700;
    }

    #${COMMENT_PANEL_ID} .content {
      white-space: pre-wrap;
      word-break: break-word;
    }
  `;

  panel
    .querySelector('[data-action="copy"]')
    .addEventListener("click", async () => {
      const comments = Array.from(commentStore.values());
      await navigator.clipboard.writeText(JSON.stringify(comments, null, 2));
      panel.querySelector('[data-role="summary"]').textContent =
        `Copied ${comments.length} loaded comments as JSON.`;
    });
  panel.querySelector('[data-action="scan"]').addEventListener("click", () => {
    toggleAutoScan();
  });

  if (!style.isConnected) {
    document.documentElement.append(style);
  }
  document.documentElement.append(panel);
  return panel;
}

function findSearchInsertionTarget() {
  const searchInput = document.querySelector(
    '[data-testid="SearchBox_Search_Input"], input[aria-label="Search query"]',
  );
  if (searchInput) {
    const explicitSearchSection =
      searchInput.closest('[aria-label="Search"]') ||
      searchInput.closest('[role="search"]');
    const searchBox =
      explicitSearchSection ||
      searchInput.closest('form, [data-testid="SearchBox_Search_Input"]') ||
      searchInput;
    return {
      host: searchBox.parentElement,
      searchBox,
      searchInput,
    };
  }
  return null;
}

function getModerationButtonText() {
  return `Spam replies (${foldedCommentStore.size})`;
}

function getModerationButtonBadgeText() {
  return foldedCommentStore.size > 99 ? "99+" : String(foldedCommentStore.size);
}

function renderModerationButtonContent(button) {
  const icon = document.createElement("span");
  const badge = document.createElement("span");
  icon.className = "cat-icon";
  icon.setAttribute("aria-hidden", "true");
  badge.className = "cat-visit-x-count-badge";
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = getModerationButtonBadgeText();
  button.replaceChildren(icon, badge);
  button.setAttribute("aria-label", getModerationButtonText());
  button.title = getModerationButtonText();
}

function upsertModerationButton() {
  if (!isStatusPage()) {
    document.getElementById(MODERATION_BUTTON_ID)?.remove();
    return;
  }

  ensureStyle();

  const existingButton = document.getElementById(MODERATION_BUTTON_ID);
  const target = findSearchInsertionTarget();

  if (!target?.host) {
    return;
  }

  const searchHeight = Math.round(
    target.searchBox.getBoundingClientRect().height ||
      target.searchInput.getBoundingClientRect().height ||
      44,
  );
  target.host.classList.add("cat-visit-x-search-host");
  target.host.style.setProperty(
    "--cat-visit-x-search-height",
    `${searchHeight}px`,
  );

  if (existingButton) {
    renderModerationButtonContent(existingButton);
    if (existingButton.parentElement !== target.host) {
      target.host.append(existingButton);
    }
    return;
  }

  const button = document.createElement("button");
  button.id = MODERATION_BUTTON_ID;
  button.type = "button";
  renderModerationButtonContent(button);
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener("click", () => {
    openModerationModal();
  });

  target.host.append(button);
}

function openModerationModal() {
  ensureStyle();

  const existingModal = document.getElementById(MODERATION_MODAL_ID);
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("section");
  modal.id = MODERATION_MODAL_ID;

  const comments = Array.from(foldedCommentStore.values());
  modal.innerHTML = `
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="cat-visit-x-moderation-title">
      <header>
        <h2 id="cat-visit-x-moderation-title">Spam replies</h2>
        <button type="button" data-action="close">Close</button>
      </header>
      <p data-role="modal-summary"></p>
      <div data-role="modal-list"></div>
      <footer>
        <span data-role="block-status">Selected users will be blocked on X.</span>
        <button type="button" data-action="prepare-block">Block selected</button>
      </footer>
    </div>
  `;

  const summary = modal.querySelector('[data-role="modal-summary"]');
  const list = modal.querySelector('[data-role="modal-list"]');
  summary.textContent = comments.length
    ? `${comments.length} spam replies found on this page.`
    : "No spam replies on this page yet.";

  list.replaceChildren(
    ...comments.map((comment) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      const body = document.createElement("div");
      const user = document.createElement("div");
      const nickname = document.createElement("span");
      const username = document.createElement("span");
      const reason = document.createElement("span");
      const commentText = document.createElement("div");

      checkbox.type = "checkbox";
      checkbox.value = comment.id;
      checkbox.checked = true;
      user.className = "user";
      nickname.textContent = comment.nickname || "(no nickname)";
      username.className = "username";
      username.textContent = comment.username || "(no username)";
      reason.className = "reason";
      reason.textContent = comment.spamReasons.length
        ? comment.spamReasons.join(", ")
        : "spam";
      commentText.className = "comment";
      commentText.textContent = comment.content;

      user.append(nickname, username, reason);
      body.append(user, commentText);
      label.append(checkbox, body);
      return label;
    }),
  );

  modal.querySelector('[data-action="close"]').addEventListener("click", () => {
    modal.remove();
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });
  modal
    .querySelector('[data-action="prepare-block"]')
    .addEventListener("click", () => {
      const selectedIds = Array.from(
        modal.querySelectorAll('input[type="checkbox"]:checked'),
      ).map((input) => input.value);
      const uniqueUsers = new Map();

      for (const id of selectedIds) {
        const comment = foldedCommentStore.get(id);
        if (comment?.username) {
          uniqueUsers.set(comment.username.toLowerCase(), comment);
        }
      }

      const commentsToBlock = Array.from(uniqueUsers.values());
      const footer = modal.querySelector("footer");
      if (commentsToBlock.length === 0) {
        modal.querySelector('[data-role="block-status"]').textContent =
          "Select at least one user with a username.";
        return;
      }

      const status = document.createElement("span");
      const actions = document.createElement("div");
      const cancel = document.createElement("button");
      const confirm = document.createElement("button");
      status.dataset.role = "block-status";
      status.textContent = `Block ${commentsToBlock.length} selected users on X?`;
      actions.style.display = "flex";
      actions.style.gap = "8px";
      cancel.type = "button";
      cancel.dataset.action = "cancel-block";
      cancel.textContent = "Cancel";
      confirm.type = "button";
      confirm.dataset.action = "confirm-block";
      confirm.textContent = `Block ${commentsToBlock.length}`;
      actions.append(cancel, confirm);
      footer.replaceChildren(status, actions);

      cancel.addEventListener("click", () => openModerationModal());
      confirm.addEventListener("click", async () => {
        confirm.disabled = true;
        cancel.disabled = true;
        modal.hidden = true;

        const results = [];
        for (let index = 0; index < commentsToBlock.length; index += 1) {
          const comment = commentsToBlock[index];
          if (index > 0) {
            await waitForBlockBatchInterval();
          }
          showBlockToast(
            `Blocking ${index + 1}/${commentsToBlock.length}: ${comment.username}…`,
            "info",
            0,
          );
          results.push(await enqueueBlock(comment));
        }

        const succeeded = results.filter((result) => result.ok);
        const failed = results.filter((result) => !result.ok);
        if (foldedCommentStore.size === 0) {
          modal.remove();
          showBlockToast(
            `Block complete: ${succeeded.length} succeeded, ${failed.length} failed.`,
            failed.length ? "error" : "info",
            5000,
          );
          return;
        }

        modal.hidden = false;
        summary.textContent =
          `Blocked ${succeeded.length} users. ${failed.length} failed.`;
        list.replaceChildren(
          ...failed.map((result) => {
            const row = document.createElement("div");
            row.style.padding = "12px 18px";
            row.style.borderBottom = "1px solid #2f3336";
            row.textContent = `${result.username}: ${result.error}`;
            return row;
          }),
        );
        footer.replaceChildren();
        const resultStatus = document.createElement("span");
        const done = document.createElement("button");
        resultStatus.dataset.role = "block-status";
        resultStatus.textContent = failed.length
          ? "Failed users were not blocked and can be retried."
          : "All selected users were blocked.";
        done.type = "button";
        done.dataset.action = "close";
        done.textContent = "Done";
        done.addEventListener("click", () => modal.remove());
        footer.append(resultStatus, done);
        showBlockToast(
          `Block complete: ${succeeded.length} succeeded, ${failed.length} failed.`,
          failed.length ? "error" : "info",
          5000,
        );
      });
    });

  document.documentElement.append(modal);
}

function setScanButtonText(text) {
  document
    .getElementById(COMMENT_PANEL_ID)
    ?.querySelector('[data-action="scan"]')
    ?.replaceChildren(document.createTextNode(text));
}

function stopAutoScan(message) {
  window.clearInterval(autoScanTimer);
  autoScanTimer = 0;
  autoScanIdleRounds = 0;
  setScanButtonText("Auto Scan");

  const summary = document
    .getElementById(COMMENT_PANEL_ID)
    ?.querySelector('[data-role="summary"]');
  if (summary && message) {
    summary.textContent = message;
  }
}

function toggleAutoScan() {
  if (autoScanTimer) {
    stopAutoScan(`Stopped at ${commentStore.size} loaded comments.`);
    return;
  }

  autoScanLastCount = commentStore.size;
  autoScanIdleRounds = 0;
  setScanButtonText("Stop");

  autoScanTimer = window.setInterval(() => {
    renderComments();

    if (commentStore.size > autoScanLastCount) {
      autoScanLastCount = commentStore.size;
      autoScanIdleRounds = 0;
    } else {
      autoScanIdleRounds += 1;
    }

    window.scrollBy({
      top: Math.max(600, Math.floor(window.innerHeight * 0.85)),
      behavior: "smooth",
    });

    const nearBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 80;
    if (nearBottom && autoScanIdleRounds >= 4) {
      stopAutoScan(`Finished scan with ${commentStore.size} loaded comments.`);
    }
  }, 1400);
}

function renderComments() {
  if (!isStatusPage()) {
    document.getElementById(COMMENT_PANEL_ID)?.remove();
    document.getElementById(MODERATION_BUTTON_ID)?.remove();
    document.getElementById(MODERATION_MODAL_ID)?.remove();
    commentStore = new Map();
    foldedCommentStore = new Map();
    markedSpamNodeStore = new Map();
    storedStatusId = "";
    stopAutoScan("");
    return;
  }

  const activeStatusId = getStatusId();

  if (activeStatusId !== storedStatusId) {
    commentStore = new Map();
    foldedCommentStore = new Map();
    markedSpamNodeStore = new Map();
    storedStatusId = activeStatusId;
    stopAutoScan("");
    document.getElementById(MODERATION_MODAL_ID)?.remove();
  }

  processVisibleSpam();
  for (const comment of collectVisibleComments()) {
    commentStore.set(comment.id, comment);
    if (comment.isSpam) {
      foldedCommentStore.set(comment.id, comment);
    }
  }
  upsertModerationButton();

  const comments = Array.from(commentStore.values());
  if (!showCommentPanel) {
    document.getElementById(COMMENT_PANEL_ID)?.remove();
    return;
  }

  const panel = upsertPanel();
  const summary = panel.querySelector('[data-role="summary"]');
  const list = panel.querySelector('[data-role="list"]');

  summary.textContent = `${comments.length} loaded comments. ${foldedCommentStore.size} marked as spam.`;
  list.replaceChildren(
    ...comments.map((comment) => {
      const item = document.createElement("li");
      const meta = document.createElement("div");
      const nickname = document.createElement("span");
      const username = document.createElement("span");
      const premium = document.createElement("span");
      const spam = document.createElement("span");
      const content = document.createElement("div");

      meta.className = "meta";
      nickname.textContent = comment.nickname || "(no nickname)";
      username.className = "username";
      username.textContent = comment.username || "(no username)";
      premium.className = "premium";
      premium.textContent = getPremiumSummary(comment.userInfo);
      spam.className = "premium";
      spam.textContent = comment.isSpam ? "Marked spam" : "";
      content.className = "content";
      content.textContent = comment.content;

      meta.append(nickname, username, premium, spam);
      item.append(meta, content);
      return item;
    }),
  );
}

function getPremiumSummary(userInfo) {
  if (!userInfo) {
    return "";
  }

  if (userInfo.isPremiumPlus) {
    return "Premium+";
  }

  if (userInfo.isPremium) {
    return "Premium/Verified";
  }

  if (userInfo.isVerified) {
    return "Verified";
  }

  return "";
}

let renderTimer = 0;

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderComments, 250);
}

let currentUrl = window.location.href;

const observer = new MutationObserver(() => {
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    commentStore = new Map();
    foldedCommentStore = new Map();
    markedSpamNodeStore = new Map();
    storedStatusId = "";
    document.getElementById(MODERATION_MODAL_ID)?.remove();
  }

  scheduleRender();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

async function loadCustomSpamKeywords() {
  const [syncStored, localStored] = await Promise.all([
    chrome.storage.sync.get([
      CUSTOM_KEYWORDS_STORAGE_KEY,
      SHOW_COMMENT_PANEL_STORAGE_KEY,
    ]),
    chrome.storage.local.get([SUBSCRIBED_KEYWORDS_STORAGE_KEY]),
  ]);
  customSpamKeywords = Array.isArray(syncStored[CUSTOM_KEYWORDS_STORAGE_KEY])
    ? syncStored[CUSTOM_KEYWORDS_STORAGE_KEY]
    : [];
  subscribedSpamKeywords = Array.isArray(
    localStored[SUBSCRIBED_KEYWORDS_STORAGE_KEY],
  )
    ? localStored[SUBSCRIBED_KEYWORDS_STORAGE_KEY]
    : [];
  showCommentPanel = syncStored[SHOW_COMMENT_PANEL_STORAGE_KEY] !== false;
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync") {
    if (changes[CUSTOM_KEYWORDS_STORAGE_KEY]) {
      const nextKeywords = changes[CUSTOM_KEYWORDS_STORAGE_KEY].newValue;
      customSpamKeywords = Array.isArray(nextKeywords) ? nextKeywords : [];
    }
    if (changes[SHOW_COMMENT_PANEL_STORAGE_KEY]) {
      showCommentPanel =
        changes[SHOW_COMMENT_PANEL_STORAGE_KEY].newValue !== false;
    }
    scheduleRender();
    return;
  }

  if (areaName === "local" && changes[SUBSCRIBED_KEYWORDS_STORAGE_KEY]) {
    const nextKeywords = changes[SUBSCRIBED_KEYWORDS_STORAGE_KEY].newValue;
    subscribedSpamKeywords = Array.isArray(nextKeywords) ? nextKeywords : [];
    scheduleRender();
  }
});

loadCustomSpamKeywords()
  .catch((error) => {
    console.warn("[XCat] Could not load custom spam keywords.", error);
  })
  .finally(scheduleRender);
