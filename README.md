# Cat Visit X

This is an unpacked Chrome extension that opens `https://x.com/` from its popup and displays a small cat badge when the current page is on X.

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

Spam comments are folded when the comment content, nickname, or username matches built-in spam signals such as giveaway, airdrop, Telegram/WhatsApp promotion, gambling, adult spam, or common Chinese spam keywords. A **Folded spam** button is inserted below the right-side X search box. It opens a list of folded users and comments with checkboxes.

The **Block selected** button is intentionally dry-run only. It logs the users that would be blocked, but it does not call the X block API.

## Load it in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/Users/pengfei/Documents/clean-x`.

After loading it, click the extension icon and choose **Visit x.com**.
