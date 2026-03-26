---
title: Fix TikTok button overflow in email footer — split into 2 rows
---
# Fix TikTok Button Overflow in Email Footer

## What & Why

All 5 social buttons (WhatsApp, Instagram, Facebook, Snapchat, TikTok) in a
single row overflow the email content width (~560px), causing TikTok to be
clipped outside the visible frame. Screenshot from user confirms this.

## Done looks like

- All 5 buttons fully visible in the email footer
- Row 1: WhatsApp, Instagram, Facebook (3 buttons, centered)
- Row 2: Snapchat, TikTok (2 buttons, centered)
- 8px vertical gap between rows
- Button styles unchanged (11px font, 0.8px letter-spacing, 8px/16px padding, brand colors)
- Server restarts cleanly

## Implementation

In `server/email.ts` `buildSocialIconsHtml()`:

1. After building `buttons[]`, split into `row1 = buttons.slice(0,3)` and `row2 = buttons.slice(3)`
2. Build the outer table with:
   - `<tr>` for row1 (3 buttons)
   - `<tr><td height="8">&nbsp;</td></tr>` spacer
   - `<tr>` for row2 (2 buttons), only if row2.length > 0

## Relevant files

- `server/email.ts` lines 87–109 (`buildSocialIconsHtml` function)
