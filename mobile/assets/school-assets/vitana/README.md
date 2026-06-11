# Vitana Default Assets

This directory contains the **default Vitana branding assets** used when building the shared Vitana SMS app (`SCHOOL_ID=vitana` or no `SCHOOL_ID` set).

These files are also used as fallbacks by `inject-school-config.js` when a white-label school has not yet provided custom assets.

## Required Files

Add the following PNG files to this directory before running `eas build`:

| File | Size | Purpose |
|---|---|---|
| `app-icon-1024.png` | 1024×1024 px | App store icon (iOS + Android) |
| `adaptive-icon.png` | 1024×1024 px | Android adaptive icon foreground (white/transparent bg) |
| `splash-screen.png` | 2048×2048 px | Launch screen image |
| `notification-icon.png` | 96×96 px | Android notification tray icon (monochrome, white on transparent) |

## Guidelines

- `app-icon-1024.png` — no rounded corners (the OS clips the icon)
- `adaptive-icon.png` — foreground layer only; safe zone is the center 66%
- `splash-screen.png` — centered logo on white background; edges are cropped on most devices
- `notification-icon.png` — single-color white silhouette on a transparent background

## White-Label Schools

Each school's assets live in `assets/school-assets/<schoolId>/` and are **not committed to git** (see `.gitignore`).

To inject a school's assets:

```bash
pnpm --filter @vitana/mobile inject:school <schoolId>
# e.g.
pnpm --filter @vitana/mobile inject:school dps-rohini
```

Replace the copied default files with the school's custom assets before building.
