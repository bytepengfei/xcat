const BADGE_ID = "cat-visit-x-badge";
const COMMENT_PANEL_ID = "cat-visit-x-comments";
const MODERATION_BUTTON_ID = "cat-visit-x-moderation-button";
const MODERATION_MODAL_ID = "cat-visit-x-moderation-modal";
const STYLE_ID = "cat-visit-x-style";
const STATUS_PAGE_PATTERN = /^\/[^/]+\/status\/\d+/;
const SPAM_KEYWORDS = [
  "airdrop",
  "giveaway",
  "free mint",
  "claim now",
  "whatsapp",
  "telegram",
  "t.me/",
  "discord.gg",
  "crypto pump",
  "稳赚",
  "返利",
  "薅羊毛",
  "空投",
  "兼职",
  "刷单",
  "博彩",
  "开奖",
  "成人",
  "约炮",
  "裸聊",
  "同城面付",
  "寻固炮",
  "固炮",
  "点击主页",
  "粉丝",
  "代充"
];
let commentStore = new Map();
let foldedCommentStore = new Map();
let storedStatusId = "";
let autoScanTimer = 0;
let autoScanLastCount = 0;
let autoScanIdleRounds = 0;

function createCatBadge() {
  if (document.getElementById(BADGE_ID)) {
    return;
  }

  const badge = document.createElement("button");
  badge.id = BADGE_ID;
  badge.type = "button";
  badge.setAttribute("aria-label", "Cat Visit X is active");
  badge.textContent = "Cat is visiting X";

  const style = document.createElement("style");
  style.textContent = `
    #${BADGE_ID} {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 2147483647;
      min-width: 150px;
      min-height: 42px;
      border: 2px solid #202124;
      border-radius: 8px;
      padding: 8px 12px 8px 38px;
      color: #202124;
      background: #f7b267;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
      font: 700 13px/1.2 Arial, Helvetica, sans-serif;
      cursor: pointer;
    }

    #${BADGE_ID}::before {
      content: "";
      position: absolute;
      left: 12px;
      top: 50%;
      width: 18px;
      height: 16px;
      border: 2px solid #202124;
      border-radius: 7px;
      background: #ffe0a8;
      transform: translateY(-50%);
    }

    #${BADGE_ID}::after {
      content: "";
      position: absolute;
      left: 17px;
      top: 17px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #202124;
      box-shadow: 8px 0 0 #202124;
    }
  `;

  badge.addEventListener("click", () => {
    badge.remove();
  });

  document.documentElement.append(style, badge);
}

createCatBadge();

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

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${MODERATION_BUTTON_ID} {
      display: block;
      box-sizing: border-box;
      width: 100%;
      min-height: 40px;
      margin: 8px 0 0;
      border: 1px solid #2f3336;
      border-radius: 999px;
      color: #e7e9ea;
      background: #000;
      font: 700 14px/1 Arial, Helvetica, sans-serif;
      cursor: pointer;
    }

    #${MODERATION_BUTTON_ID}:hover {
      background: #16181c;
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

    #${MODERATION_MODAL_ID} [data-action="dry-block"] {
      background: #f4212e;
    }
  `;

  document.documentElement.append(style);
}

function getCommentId(article) {
  const statusLink = Array.from(article.querySelectorAll('a[href*="/status/"]')).find((link) => {
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
  const profileLink = Array.from(article.querySelectorAll('a[href^="/"]')).find((link) => {
    const href = link.getAttribute("href") || "";
    return /^\/[A-Za-z0-9_]+$/.test(href);
  });
  const avatar = article.querySelector('img[src*="profile_images"]');
  const usernameFromLink = profileLink ? `@${profileLink.getAttribute("href").slice(1)}` : "";
  const usernameText = userNameBlock
    ? Array.from(userNameBlock.querySelectorAll("span"))
        .map((span) => normalizeText(span.textContent || ""))
        .find((text) => /^@[A-Za-z0-9_]+$/.test(text))
    : "";
  const nickname = userNameBlock
    ? normalizeText(userNameBlock.querySelector("span")?.textContent || "")
    : "";
  const visibleUserText = userNameBlock ? normalizeText(userNameBlock.innerText || userNameBlock.textContent || "") : "";
  const badgeLabels = userNameBlock
    ? Array.from(userNameBlock.querySelectorAll("[aria-label], [title]"))
        .map((element) => normalizeText(`${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`))
        .filter(Boolean)
    : [];
  const verifiedLabel = badgeLabels.find((label) => /verified|premium|subscribe/i.test(label)) || "";
  const isPremiumPlus = badgeLabels.some((label) => /premium\s*\+/i.test(label));
  const hasPremiumLabel = badgeLabels.some((label) => /premium/i.test(label));
  const isVerified = badgeLabels.some((label) => /verified/i.test(label));

  return {
    nickname,
    username: usernameText || usernameFromLink,
    profileUrl: profileLink ? new URL(profileLink.getAttribute("href"), window.location.origin).href : "",
    avatarUrl: avatar ? avatar.src : "",
    userNameBlockText: visibleUserText,
    badgeLabels,
    verifiedLabel,
    isVerified,
    isPremium: hasPremiumLabel || (isVerified && /verified account/i.test(verifiedLabel)),
    isPremiumPlus
  };
}

function getCommentContent(article) {
  const tweetText = article.querySelector('[data-testid="tweetText"]');
  if (!tweetText) {
    return "";
  }

  const text = normalizeText(tweetText.innerText || tweetText.textContent || "");
  const mediaLabels = Array.from(tweetText.querySelectorAll("img[alt], [aria-label]"))
    .map((element) => normalizeText(element.getAttribute("alt") || element.getAttribute("aria-label") || ""))
    .filter(Boolean);

  return normalizeText([text, ...mediaLabels].join(" "));
}

function detectSpam(comment) {
  const searchableText = [
    comment.nickname,
    comment.username,
    comment.userInfo?.userNameBlockText,
    comment.content,
    comment.rawArticleText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const reasons = [];

  for (const keyword of SPAM_KEYWORDS) {
    if (searchableText.includes(keyword.toLowerCase())) {
      reasons.push(`keyword:${keyword}`);
    }
  }

  if (/(https?:\/\/|www\.)\S+/i.test(comment.content) && /(免费|领取|claim|airdrop|giveaway|bonus)/i.test(comment.content)) {
    reasons.push("promo-link");
  }

  if (/(.)\1{8,}/.test(comment.content)) {
    reasons.push("repeated-characters");
  }

  return {
    isSpam: reasons.length > 0,
    reasons
  };
}

function buildCommentFromArticle(article) {
  const userInfo = getUserInfo(article);
  const content = getCommentContent(article);
  const id = getCommentId(article);
  const rawArticleText = normalizeText(article.innerText || article.textContent || "");
  const comment = {
    id,
    nickname: userInfo.nickname,
    username: userInfo.username,
    userInfo,
    content,
    rawArticleText
  };
  const spam = detectSpam(comment);

  return {
    ...comment,
    isSpam: spam.isSpam,
    spamReasons: spam.reasons
  };
}

function collectVisibleComments() {
  if (!isStatusPage()) {
    return [];
  }

  const main = document.querySelector("main") || document;
  const articles = Array.from(main.querySelectorAll('article[data-testid="tweet"]'));
  const replyArticles = articles.slice(1);
  const originalStatusId = getStatusId();

  return replyArticles
    .map((article) => buildCommentFromArticle(article))
    .filter((comment) => {
      if (!comment.nickname && !comment.username) {
        return false;
      }

      if (!comment.content && !comment.isSpam) {
        return false;
      }

      return originalStatusId ? !comment.id.includes(`/status/${originalStatusId}`) : true;
    });
}

function getVisibleCommentEntries() {
  if (!isStatusPage()) {
    return [];
  }

  const main = document.querySelector("main") || document;
  const articles = Array.from(main.querySelectorAll('article[data-testid="tweet"]'));
  const originalStatusId = getStatusId();

  return articles.slice(1).map((article) => {
    const comment = buildCommentFromArticle(article);

    return {
      article,
      comment
    };
  }).filter(({ comment }) => {
    if (!comment.nickname && !comment.username) {
      return false;
    }

    if (!comment.content && !comment.isSpam) {
      return false;
    }

    return originalStatusId ? !comment.id.includes(`/status/${originalStatusId}`) : true;
  });
}

function removeSpamCommentArticle(article, comment) {
  if (!comment.isSpam) {
    return;
  }

  foldedCommentStore.set(comment.id, comment);
  article.remove();
}

function processVisibleSpam() {
  for (const { article, comment } of getVisibleCommentEntries()) {
    commentStore.set(comment.id, comment);
    if (comment.isSpam) {
      removeSpamCommentArticle(article, comment);
    }
  }
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

  const style = document.createElement("style");
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

  panel.querySelector('[data-action="copy"]').addEventListener("click", async () => {
    const comments = Array.from(commentStore.values());
    await navigator.clipboard.writeText(JSON.stringify(comments, null, 2));
    panel.querySelector('[data-role="summary"]').textContent = `Copied ${comments.length} loaded comments as JSON.`;
  });
  panel.querySelector('[data-action="scan"]').addEventListener("click", () => {
    toggleAutoScan();
  });

  document.documentElement.append(style, panel);
  return panel;
}

function findSearchInsertionTarget() {
  const searchInput = document.querySelector('[data-testid="SearchBox_Search_Input"], input[aria-label="Search query"]');
  if (searchInput) {
    const searchBox = searchInput.closest('[data-testid="SearchBox_Search_Input"], form') || searchInput;
    return {
      parent: searchBox.parentElement,
      reference: searchBox
    };
  }

  const sidebar = document.querySelector('aside [data-testid="sidebarColumn"], aside');
  return sidebar
    ? {
        parent: sidebar,
        reference: sidebar.firstElementChild
      }
    : null;
}

function getModerationButtonText() {
  return `Hidden spam (${foldedCommentStore.size})`;
}

function upsertModerationButton() {
  if (!isStatusPage()) {
    document.getElementById(MODERATION_BUTTON_ID)?.remove();
    return;
  }

  ensureStyle();

  const existingButton = document.getElementById(MODERATION_BUTTON_ID);
  const target = findSearchInsertionTarget();

  if (!target || !target.parent) {
    return;
  }

  if (existingButton) {
    existingButton.textContent = getModerationButtonText();
    if (target.parent && existingButton.parentElement !== target.parent) {
      target.reference?.insertAdjacentElement("afterend", existingButton);
    }
    return;
  }

  const button = document.createElement("button");
  button.id = MODERATION_BUTTON_ID;
  button.type = "button";
  button.textContent = getModerationButtonText();
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener("click", () => {
    openModerationModal();
  });

  if (target.reference) {
    target.reference.insertAdjacentElement("afterend", button);
  } else {
    target.parent.append(button);
  }
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
        <h2 id="cat-visit-x-moderation-title">Hidden spam comments</h2>
        <button type="button" data-action="close">Close</button>
      </header>
      <p data-role="modal-summary"></p>
      <div data-role="modal-list"></div>
      <footer>
        <span data-role="block-status">Dry-run mode: X API will not be called.</span>
        <button type="button" data-action="dry-block">Block selected</button>
      </footer>
    </div>
  `;

  const summary = modal.querySelector('[data-role="modal-summary"]');
  const list = modal.querySelector('[data-role="modal-list"]');
  summary.textContent = comments.length
    ? `${comments.length} hidden comments found on this page.`
    : "No hidden spam comments on this page yet.";

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
      reason.textContent = comment.spamReasons.length ? comment.spamReasons.join(", ") : "spam";
      commentText.className = "comment";
      commentText.textContent = comment.content;

      user.append(nickname, username, reason);
      body.append(user, commentText);
      label.append(checkbox, body);
      return label;
    })
  );

  modal.querySelector('[data-action="close"]').addEventListener("click", () => {
    modal.remove();
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });
  modal.querySelector('[data-action="dry-block"]').addEventListener("click", () => {
    const selectedIds = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
    const selectedComments = selectedIds
      .map((id) => foldedCommentStore.get(id))
      .filter(Boolean);
    const uniqueUsers = new Map();

    for (const comment of selectedComments) {
      if (comment.username) {
        uniqueUsers.set(comment.username, comment);
      }
    }

    const users = Array.from(uniqueUsers.keys());
    modal.querySelector('[data-role="block-status"]').textContent = `Dry run: would block ${users.length} users.`;
    console.info("[Cat Visit X] Dry-run block users:", users, Array.from(uniqueUsers.values()));
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

  const summary = document.getElementById(COMMENT_PANEL_ID)?.querySelector('[data-role="summary"]');
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
      behavior: "smooth"
    });

    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
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
    storedStatusId = "";
    stopAutoScan("");
    return;
  }

  const activeStatusId = getStatusId();

  if (activeStatusId !== storedStatusId) {
    commentStore = new Map();
    foldedCommentStore = new Map();
    storedStatusId = activeStatusId;
    stopAutoScan("");
    document.getElementById(MODERATION_MODAL_ID)?.remove();
  }

  const panel = upsertPanel();
  processVisibleSpam();
  for (const comment of collectVisibleComments()) {
    commentStore.set(comment.id, comment);
    if (comment.isSpam) {
      foldedCommentStore.set(comment.id, comment);
    }
  }
  upsertModerationButton();

  const comments = Array.from(commentStore.values());
  const summary = panel.querySelector('[data-role="summary"]');
  const list = panel.querySelector('[data-role="list"]');

  summary.textContent = `${comments.length} loaded comments. ${foldedCommentStore.size} hidden as spam.`;
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
      spam.textContent = comment.isSpam ? "Hidden spam" : "";
      content.className = "content";
      content.textContent = comment.content;

      meta.append(nickname, username, premium, spam);
      item.append(meta, content);
      return item;
    })
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
    storedStatusId = "";
    document.getElementById(MODERATION_MODAL_ID)?.remove();
  }

  scheduleRender();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

scheduleRender();
