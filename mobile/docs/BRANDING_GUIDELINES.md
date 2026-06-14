# Vitana Branding Guidelines

> **Version**: 2.0  
> **Product**: Vitana School Management System — Mobile App

---

## Brand Identity

**Vitana** is a modern, enterprise-grade School Management System. The mobile app must communicate:

- **Trust** — Schools and parents are entrusting sensitive data
- **Premium** — Enterprise-quality product worth paying for
- **Educational** — Approachable, warm, not cold/corporate
- **Modern** — Comparable to Notion, Linear, Stripe in visual quality

---

## Logo Usage

### Primary Logo

The Vitana logo (`assets/logo/vitanalogo2-removebg-preview.png`) features a red diamond lattice grid with "VITANA" wordmark.

**Usage rules:**
- Always render on the auth screens as the default fallback when no school logo is configured
- When displayed on gradient backgrounds, use with `backgroundColor: 'rgba(255,255,255,0.15)'` container
- Minimum size: 40×40 logical pixels
- Never stretch or distort — always use `contentFit: 'contain'`
- The logo is red on white — do not place directly on dark backgrounds without the white container

```typescript
<Image
  source={require('../../assets/logo/vitanalogo2-removebg-preview.png')}
  style={{ width: 70, height: 70 }}
  contentFit="contain"
  accessibilityLabel="Vitana SMS"
/>
```

### School Logo

When a school's `branding.logoUrl` is available, display it in place of the Vitana logo:

```typescript
{branding?.logoUrl ? (
  <Image source={{ uri: branding.logoUrl }} style={{ width: 80, height: 80 }} contentFit="contain" />
) : (
  <Image source={require('../../assets/logo/vitanalogo2-removebg-preview.png')} ... />
)}
```

---

## Color Palette

### Primary Brand Colors

| Name | Hex | Usage |
|---|---|---|
| Vitana Blue | `#1a6fd8` | Primary buttons, active states, links, accent elements |
| Vitana Navy Dark | `#1d4ed8` | Gradient end, hover/pressed states |
| Vitana Deep Navy | `#0d1b3e` | Auth screen gradient start |

### Semantic Colors

| Name | Hex | Context |
|---|---|---|
| Success Green | `#22c55e` | Attendance present, marks passed, approved |
| Warning Amber | `#f59e0b` | Pending, below threshold, caution |
| Error Red | `#ef4444` | Absent, failed, rejected, overdue |
| Info Blue | `#3b82f6` | Informational, neutral links |

### Neutral Palette

| Name | Hex | Usage |
|---|---|---|
| Page Background | `#f5f7fa` | All screen backgrounds |
| Card Surface | `#ffffff` | Cards, sheets, modals |
| Input Fill | `#f8fafc` | Text input backgrounds |
| Border | `#e5e7eb` | Card borders, dividers |
| Text Primary | `#1a1a2e` | All body/heading text |
| Text Secondary | `#6b7280` | Subtext, labels, placeholders |

---

## Typography

### Font Families

| Font | Weight | Use Case |
|---|---|---|
| **Poppins** | 700 (Bold) | Screen titles, card section headings, dashboard greetings |
| **Poppins** | 600 (SemiBold) | SubScreenHeader titles, navigation labels |
| **Inter** | 500–600 | Body text, form labels, list row titles |
| **Inter** | 400 (Regular) | Secondary text, captions, metadata |

### Type Scale

| Scale | Size | Font | Weight | Usage |
|---|---|---|---|---|
| Display | 30px | Poppins | 700 | Hero text (not currently used) |
| H1 | 24px | Poppins | 700 | App name on auth screen |
| H2 | 20px | Poppins | 700 | Dashboard greeting name |
| H3 | 17px | Poppins | 700 | Screen titles in SubScreenHeader |
| H4 | 15px | Poppins | 600 | Section card titles |
| Body | 15px | Inter | 500 | List row titles, form values |
| Caption | 13px | Inter | 400 | Secondary row text, metadata |
| Label | 11px | Inter | 600 | Uppercase section labels, badges |
| Micro | 11px | Inter | 400 | Timestamps, version info |

---

## Auth Screen Design

The auth screens establish the brand's first impression.

### Design Language
- **Background**: Deep navy to Vitana Blue gradient (`#0d1b3e → #1a3a7a → #1a6fd8`)
- **Card**: White floating card with `borderRadius: 24` and heavy shadow (`elevation: 12`)
- **Logo area**: Semi-transparent white container on gradient background
- **Feel**: Premium fintech-style login (inspired by Stripe, Cred, Razorpay)

### Login Screen Hierarchy
1. Vitana/School Logo (centered, 96×96 container)
2. School/App Name (Poppins 700, white)
3. "School Management System" tagline (Inter 400, white 70% opacity)
4. White card: "Welcome back" title + form fields
5. "Powered by Vitana SMS" footer (minimal, white 50% opacity)

---

## Navigation Design

### Tab Bar
- Background: `#ffffff`
- Active icon: `primaryColor` (school-branded)
- Inactive icon: `#94a3b8`
- Active label: `Inter 600`, `primaryColor`
- Height: 82px (iOS) / 64px (Android)
- Shadow: subtle top shadow (elevation 8)

### Dashboard Headers
- Full-width `LinearGradient` from `primaryColor` to darkened variant
- School name in `Poppins 600` white
- Notification bell icon (36×36 white-tinted circle)
- No explicit back button (root tab screen)

### Sub-Screen Headers
- White background with 1px bottom border
- Back button: 36×36 rounded square (`#f5f7fa` background)
- Title: `Poppins 700`, 17px, `VITANA_COLORS.text`
- Right slot for optional actions

---

## Card Design

### Standard Card
- Background: `#ffffff`
- Border: `1px solid #e5e7eb`
- Border Radius: 14px
- Shadow: `VITANA_SHADOWS.sm` (iOS) / `elevation: 2` (Android)
- Padding: 16px

### Elevated Card (important actions)
- Same as standard + `VITANA_SHADOWS.md`

### Profile/Banner Card
- `LinearGradient` (primaryColor → darker)
- Border Radius: 18px
- Shadow: `VITANA_SHADOWS.md`
- White text on gradient

---

## Icon System

All icons use **Feather** from `@expo/vector-icons`. Size conventions:

| Context | Size |
|---|---|
| Tab bar icons | 22px (system default) |
| Section card icons | 14px |
| List row icons | 18px |
| Header action buttons | 20px |
| Empty state icons | 36px |
| Input field icons | 18px |

---

## White-Label Configuration

Schools can customize:
- `primaryColor` — drives all gradient, active, and accent colors
- `accentColor` — secondary accent
- `logoUrl` — replaces Vitana logo
- `schoolName` — displayed in headers
- `fonts.heading` / `fonts.body` — replaces Poppins/Inter

Customization is applied via `SchoolThemeProvider` which makes derived colors available through `useAppTheme()`. All `ui/` components accept `primaryColor` prop for direct override.
