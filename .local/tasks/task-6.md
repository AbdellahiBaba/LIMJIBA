---
title: Update logo across entire project with new LIMJIBA brand logo
---
---
title: Update logo across entire project with new branded logo
---
# Update Logo — New LIMJIBA Brand Logo

## What & Why

The user has provided a new brand logo (camel + airplane + Arabic text "لمجيبة" +
"IMPORTING" in gold). It must replace the old logo in every location across the project.

## Done looks like

- New logo visible in: admin sidebar, admin login page, store header/navbar, store
  login/signup/forgot-password/reset-password pages, about page, PWA install prompt,
  AI chat component, cinematic reveal on store home page
- Favicons (favicon.png, favicon.jpeg) updated to new logo
- PWA manifest.json icon updated
- Server-side PDF generation fallback logo updated
- No broken images anywhere in the app
- App restarts cleanly

## Implementation

### Step 1 — Copy new logo file into assets

Copy the new logo to a clean filename:
```
cp attached_assets/Untitled_Project_-_illustrationImage_(12)_1773959354248.png \
   attached_assets/logo.png
```

Also copy to `client/public/` so it can serve as favicon:
```
cp attached_assets/logo.png client/public/favicon.png
cp attached_assets/logo.png client/public/favicon.jpeg  # clients expecting jpeg
cp attached_assets/logo.png client/public/logo.png
```

### Step 2 — Update all TypeScript/TSX imports

Replace every import of:
`@assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png`

with:
`@assets/logo.png`

Files to update (11 total):
- `client/src/pages/login.tsx`
- `client/src/pages/store/login.tsx`
- `client/src/pages/store/signup.tsx`
- `client/src/pages/store/forgot-password.tsx`
- `client/src/pages/store/reset-password.tsx`
- `client/src/pages/store/about.tsx`
- `client/src/components/store-layout.tsx`
- `client/src/components/app-sidebar.tsx`
- `client/src/components/cinematic-logo-reveal.tsx`
- `client/src/components/limjiba-chat.tsx`
- `client/src/components/pwa-install-prompt.tsx`

### Step 3 — Update server/routes.ts fallback logo path

Two occurrences at lines ~1515 and ~2428 reference:
`attached_assets/WhatsApp_Image_2026-03-09_at_20.11.18-removebg-preview_1773192470477.png`

Change both to:
`attached_assets/logo.png`

### Step 4 — Update PWA manifest.json

Change icon src from `/favicon.jpeg` to `/favicon.png` and update type to `image/png`:
```json
{ "src": "/favicon.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
{ "src": "/favicon.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
```

### Step 5 — Restart and verify

Restart the workflow and confirm clean startup with no broken image references.

## Relevant files

- `attached_assets/Untitled_Project_-_illustrationImage_(12)_1773959354248.png` (source)
- `attached_assets/logo.png` (target clean name)
- `client/public/favicon.png`, `client/public/favicon.jpeg`, `client/public/logo.png`
- `client/public/manifest.json`
- `client/src/pages/login.tsx`
- `client/src/pages/store/login.tsx`
- `client/src/pages/store/signup.tsx`
- `client/src/pages/store/forgot-password.tsx`
- `client/src/pages/store/reset-password.tsx`
- `client/src/pages/store/about.tsx`
- `client/src/components/store-layout.tsx`
- `client/src/components/app-sidebar.tsx`
- `client/src/components/cinematic-logo-reveal.tsx`
- `client/src/components/limjiba-chat.tsx`
- `client/src/components/pwa-install-prompt.tsx`
- `server/routes.ts` (lines ~1515 and ~2428)