# Demo Recording Script

A recruiter scrolling your repo gives the README ~30 seconds. A 30-45 second screen recording is the single highest-leverage thing you can put there. This is the shot list.

## Tools

- **Loom** (free, easiest) → upload, get a shareable link, paste at the top of the README.
- Or **OBS / ScreenToGif / macOS QuickTime** → export `.mp4` or `.gif` and drag it into a GitHub PR comment to get a CDN URL.
- Aim for **under 5 MB** if it's a GIF, **under 25 MB** if it's an MP4 (GitHub's limit).

## Before you record

- Open the live site in a clean Chrome incognito window.
- Wake the Render backend first (visit any page, wait 30s for the cold start).
- Have a real prescription image or photo on your desktop (or use a placeholder PNG).
- Have your phone next to you with WhatsApp open if you want to capture the reminder landing.
- Resize the window to ~1280×800 — keeps the file small and looks framed on GitHub.

## The six-shot script (~40s total)

| # | Shot | What to do | Approx time |
|---|---|---|---|
| 1 | **Login** | Type credentials, hit "Sign In" | 5s |
| 2 | **Dashboard** | Pause for 2s on the dashboard greeting + family member cards. This is the "money shot" of the project. | 5s |
| 3 | **Add a medicine** | Click "+ Add Medicine", drop the prescription image, show the form auto-fill from OCR | 10s |
| 4 | **Mark a dose taken** | On the Doses Today page, click "Mark Taken" — show the optimistic UI flip instantly | 5s |
| 5 | **SOS preview** | Open SOS Setup, point at the contact list. (Don't actually fire SOS unless your test contacts agreed.) | 5s |
| 6 | **Mobile view** | DevTools → toggle device toolbar → iPhone 12 → scroll the dashboard | 10s |

## After recording

1. Replace the placeholder block in the main `README.md`:

   ```markdown
   ## Demo

   ![FamilyCare demo](./docs/demo.gif)
   ```

   or if you uploaded to Loom / YouTube:

   ```markdown
   ## Demo

   [![Watch the demo](./docs/demo-thumbnail.png)](https://www.loom.com/share/xxxxx)
   ```

2. Delete the `<!-- ... -->` placeholder block above the demo.

3. Commit with a message like `docs: add 30s demo recording`.

## What NOT to record

- Don't record the cold-start spinner waiting for Render. Wake it up first.
- Don't show real phone numbers — blur or use test data.
- Don't show real OTPs or auth flows that leak email addresses.
- Don't make it longer than 60 seconds. A recruiter watching past 45s is rare; past 60 is exceptional.
