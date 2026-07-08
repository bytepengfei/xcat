# XCat

This is an unpacked Chrome extension that opens `https://x.com/` from its popup and filters unwanted replies on X post pages.

On a specific post page, for example `https://x.com/dotey/status/2059143273889853709`, it also reads loaded comments and shows a floating panel with:

- `nickname`
- `username`
- `userInfo.profileUrl`
- `userInfo.avatarUrl`
- `userInfo.badgeLabels`
- `userInfo.isVerified`
- `userInfo.isPremium`
- `userInfo.isPremiumPlus`
- `content`

Click **Auto Scan** to scroll the post page and collect more loaded comments automatically. Click **Copy JSON** in the panel to copy the collected comments. X loads replies dynamically, so the extension can collect comments that X has loaded into the page.

Premium fields are inferred from labels that X exposes in the page DOM, such as `Verified account` or `Premium+`. If X does not expose a tier label for a user, the extension cannot reliably distinguish Premium from Premium+.

Spam comments are muted in place when the comment content, nickname, or username matches a custom keyword configured in the settings page. A round cat button is inserted next to the right-side X search box, with a badge that shows the current spam reply count. It opens a list of spam users and comments with checkboxes. Muted replies are re-marked as X virtualizes the timeline during scrolling.

Open **Keyword settings** from the extension popup to add custom spam keywords. Enter one keyword per line. The settings are saved with Chrome sync storage and apply to open X pages without reinstalling the extension. XCat does not ship built-in spam keywords. The settings page also supports keyword subscription URLs: enter one URL per line, click **Sync**, and XCat fetches those lists into a read-only preview. Subscription keywords are cached locally and used together with custom keywords.

The settings page also includes a switch for the floating X comments panel. Disabling the panel does not disable spam filtering or the spam list button.

Use **Block selected** to review and block the checked spam users through X's native Block controls. Each visible reply also has a crossed-out cat icon next to X's More button for immediately blocking that reply's author. Blocking uses the current X login session and processes users one at a time.

## Load it in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/Users/pengfei/Documents/clean-x`.

After loading it, click the extension icon and choose **Visit x.com**.
