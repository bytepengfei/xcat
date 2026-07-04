const visitButton = document.getElementById("visit-x");
const settingsButton = document.getElementById("open-settings");
const statusText = document.getElementById("status");

visitButton.addEventListener("click", async () => {
  statusText.textContent = "Opening x.com...";

  try {
    await chrome.tabs.create({ url: "https://x.com/" });
    statusText.textContent = "Cat is visiting X.";
  } catch (error) {
    statusText.textContent = "Could not open x.com.";
  }
});

settingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
