# Redesign Email Social Links — No Images

## What & Why
Every image-based approach fails because most email clients (Gmail, Outlook, corporate
clients) block external images by default, and the broken-image placeholder visually
corrupts the footer. The fix is permanent: remove all image loading and replace with
pure HTML/CSS platform-name link buttons — exactly what Stripe, Apple, and Shopify do.

## Done looks like
- Email footer shows a clean row of social platform name buttons (e.g. WhatsApp,
  Instagram, Facebook) — each as a rectangular colored link badge
- Renders identically in Gmail, Outlook 2007-2019, Apple Mail, Yahoo, and all mobile
  clients — no broken images, no placeholders, no abbreviations
- Clicking any badge opens the correct social media link
- If only 1-2 platforms are configured, they still center correctly
- The `client/public/social-icons/` directory and all PNG files are removed (no longer
  needed)

## Design spec
Footer dark section (background `#0A1628`). The social block:

```
FOLLOW US

[  WhatsApp  ] [  Instagram  ] [  Facebook  ] [  Snapchat  ] [  TikTok  ]
```

Each button:
- Background: platform brand color (green, pink, blue, yellow, black)
- Text: platform name in full (`WhatsApp`, `Instagram`, etc.) — no abbreviations
- Font: Arial, 11px, bold, letter-spacing 0.8px, uppercase, white (dark for Snapchat)
- Padding: 8px top/bottom, 16px left/right
- Border-radius: 4px (renders as rounded rectangle; degrades to plain rectangle in
  Outlook — both look clean)
- Spacing between buttons: 6px horizontal gap
- Whole button is a clickable link

Implementation uses the "bulletproof button" table pattern (standard email practice):
Each button is a `<table>` → `<tr>` → `<td style="background:...;border-radius:4px">` →
`<a style="display:inline-block;padding:8px 16px;...">`. This is the only pattern
guaranteed to work in Outlook without VML hacks.

## Tasks

1. **Rewrite `buildSocialIconsHtml()`** — Replace the current image-based icon layout
   with bulletproof rectangular link buttons. Use the table-within-table pattern for
   each button. Outer table is one `<tr>` with one `<td>` per platform (separated by
   6px padding). No `<img>` tags, no external URLs, no icon files referenced.

2. **Delete `client/public/social-icons/` directory** — Remove all 5 PNG files and the
   directory since they are no longer used by any template.

3. **Restart and verify** — Restart the workflow, confirm clean startup, confirm
   `/social-icons/` returns 404 (expected after deletion), and confirm the email
   template builds without errors.

## Relevant files
- `server/email.ts:78-120`
- `client/public/social-icons/`
