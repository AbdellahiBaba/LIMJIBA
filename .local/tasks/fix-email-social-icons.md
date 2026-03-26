# Fix Email Social Media Icons

## What & Why
The current PNG icon files in `client/public/social-icons/` are broken — ImageMagick's SVG renderer silently failed to draw the icon content, leaving only the circle background color. When email clients fetch these images, they show a broken-image placeholder + alt text overlaid on the colored circles.

The fix is to replace these broken files by downloading real colored PNG icons from `img.icons8.com` (confirmed returning `200 OK` for PNG format), then resize them to 44×44px for email use.

## Done looks like
- Email footer shows proper social media brand icons: WhatsApp phone bubble, Instagram camera, Facebook "f", Snapchat ghost, TikTok note logo
- Icons are full-color, clearly recognizable brand icons (not text abbreviations)
- Platform names below each icon are on a single line (no wrapping)
- Fallback: if images are blocked by an email client, the colored circle background still shows

## Out of scope
- Changing which platforms are displayed
- Changing the email template structure
- Adding new social platforms

## Tasks
1. **Download real PNG icons** — Use `curl` to download 96×96 PNG icons for WhatsApp, Instagram, Facebook, Snapchat, and TikTok from `img.icons8.com/color/96/`. Save directly over the broken files at `client/public/social-icons/`.
   - WhatsApp: `https://img.icons8.com/color/96/whatsapp.png`
   - Instagram: `https://img.icons8.com/color/96/instagram-new.png`
   - Facebook: `https://img.icons8.com/color/96/facebook-new.png`
   - Snapchat: `https://img.icons8.com/color/96/snapchat.png`
   - TikTok: `https://img.icons8.com/color/96/tiktok.png`

2. **Resize to 44×44** — Use ImageMagick's `convert` to resize each downloaded 96×96 PNG to exactly 44×44px and verify the output is a valid PNG with actual icon content (not just a solid color).

3. **Verify and test** — Confirm each icon file is valid (has pixel variance, not just a solid color), is served at `GET /social-icons/{platform}.png` with `200 image/png`, and is non-trivially sized (>2KB).

## Relevant files
- `client/public/social-icons/`
- `server/email.ts:79-115`
