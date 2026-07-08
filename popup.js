const visitButton = document.getElementById("visit-x");
const settingsButton = document.getElementById("open-settings");
const statusText = document.getElementById("status");

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

XCatI18n.load().then(() => {
  XCatI18n.apply();
});
