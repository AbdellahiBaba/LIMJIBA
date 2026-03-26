# Fix Product Image Display in Emails

## What & Why
The product image in `sendProductMarketingEmail` (and any future email that shows a product) currently breaks in several major email clients because:

1. **No explicit `width`/`height` attributes** on the `<img>` tag — Outlook and many mobile clients need hard numeric dimensions to reserve space and render images. Without them Outlook shows a "broken envelope" placeholder.
2. **No `display:block` style** — Without it, inline image baseline gap creates a thin white line below images in Outlook and older Gmail.
3. **No `border="0"` attribute** — Outlook adds a blue border around linked images without it.
4. **`box-shadow` ignored by Outlook** — Outlook's Word rendering engine silently drops this CSS, which is fine, but should be replaced with an Outlook-safe `border` instead of relying on it.
5. **`max-width/max-height` ignored by Outlook** — Outlook ignores CSS `max-width`; without a real `width` attribute the image renders at native size (could be huge).
6. **No table wrapper** — Outlook needs images wrapped in a `<table>` with a `<td width="...">` for reliable centering and sizing.
7. **`resolveImg` accepts `blob:` and `data:` URLs** — These are browser-session-only and are dead/blocked in every email client. They must be rejected before use.

## Done looks like
- The product image in marketing emails renders at a fixed 560px wide (or the email container width) in Gmail, Apple Mail, and Outlook
- No "broken envelope" or missing image placeholder is shown — image loads cleanly on first view
- Clicking the image opens the product page
- If the product has no valid image (null, blob:, data:, relative-only path), the image block is silently omitted — no broken placeholder shown
- Labels below the image are not affected

## Out of scope
- Changing the email content (copy, CTA text, pricing block)
- Abandoned cart email (no product images)
- Admin digest email (no product images)
- POS receipt email (no product images)

## Tasks

1. **Fix `resolveImg` URL filter** — Extend the function to also reject `blob:` and `data:` URL schemes (in addition to non-http ones). These render as dead links in every email client.

2. **Rewrite `imgBlock` with email-safe markup** — Replace the bare `<img>` with a proper email-compatible structure:
   - Wrap in a `<table role="presentation">` with explicit `width="560"` (or the max content width)
   - The `<td>` should have `align="center"` and a matching `width`
   - The `<img>` needs: `width="560"` attribute, `height="auto"` style, `display:block` style, `border="0"` attribute
   - Remove `box-shadow` (unsupported by Outlook); keep the `border` for a gold accent frame
   - Remove `max-height:340px` since it's ignored by Outlook; rely on the fixed `width` attribute for proportional scaling
   - The `<a>` link wrapper should have `display:block` style so the entire image is clickable

3. **Verify server restart** — Restart the workflow, confirm the server starts cleanly, and confirm no TypeScript errors.

## Relevant files
- `server/email.ts:578-645`
