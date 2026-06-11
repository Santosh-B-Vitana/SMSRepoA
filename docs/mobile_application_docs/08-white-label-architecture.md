# Vitana Mobile Platform — White Label Architecture

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [07-feature-flag-architecture](./07-feature-flag-architecture.md) · [11-build-automation](./11-build-automation.md) · [12-deployment-strategy](./12-deployment-strategy.md)

---

## 1. White Label Vision

Every school using Vitana at the Enterprise tier can have its own dedicated mobile app:
- Published under its own name in the Play Store and App Store.
- Branded with its logo, colors, app icon, and splash screen.
- Hardcoded to the school's domain (no school-selection screen).
- Completely indistinguishable from a school-built app to the end user.

All of this comes from **one codebase** with build-time configuration injection.

> **CRITICAL:** Each school gets **ONE white-label binary** — not three. Parents, teachers, students, and admins at that school all use the same branded app (`com.<school>.sms`). After login the JWT role routes them to the appropriate portal inside that one binary.
>
> Do NOT build separate parent/teacher/student binaries per school. The role-based portal routing (RBAC) already handles separating the experience.

---

## 2. App Variants

| Variant | Package Name / Bundle ID | Branding | Users Served | How Generated |
|---|---|---|---|---|
| **Shared Vitana App** | `com.vitana.sms` | Vitana brand | All schools, all roles | Static build |
| **Dedicated School App** | `com.<schoolcode>.sms` | School brand | All roles at that school | EAS build with `SCHOOL_ID` |

> Each variant is **one binary**. Role-based portal routing (RBAC) handles separating the parent, teacher, student, and admin experiences inside that binary.
> There is no "parent binary", "teacher binary", or "student binary".

---

## 3. What Gets Customized Per School

| Asset | Type | Where Used | Who Provides |
|---|---|---|---|
| App Icon (1024×1024 PNG) | Build-time | Play Store, App Store, home screen | School uploads |
| Adaptive Icon (Android) | Build-time | Android 8+ adaptive icon | Generated from base icon |
| Splash Screen (2048×2048 PNG) | Build-time | App launch splash | School uploads |
| App Name | Build-time | Store listing, phone home screen | School provides |
| Bundle Identifier | Build-time | iOS App Store identity | `com.<code>.sms` |
| Package Name | Build-time | Android Play Store identity | `com.<code>.sms` |
| Primary Color | Both (build + runtime) | Theme, header, buttons | School settings |
| Accent Color | Both | Secondary UI elements | School settings |
| School Domain | Build-time | Pre-configured login target | School's API domain |
| Store Short Description | Metadata | Store listing | School provides |
| Store Full Description | Metadata | Store listing | School / Vitana template |
| Store Screenshots | Metadata | Store listing | Vitana generates |
| Keywords | Metadata | Store SEO | Vitana + school |

---

## 4. Storage Architecture

### 4.1 School Asset Storage (S3)

```
s3://vitana-assets/
├── schools/
│   ├── {schoolId}/
│   │   ├── branding/
│   │   │   ├── logo-original.png          (uploaded by school)
│   │   │   ├── logo-512.png               (processed)
│   │   │   ├── app-icon-1024.png          (processed for stores)
│   │   │   ├── app-icon-adaptive-bg.png   (Android adaptive)
│   │   │   ├── splash-screen.png          (processed)
│   │   │   └── branding-config.json       (colors, fonts, metadata)
│   │   └── store-assets/
│   │       ├── screenshots/
│   │       │   ├── android/
│   │       │   └── ios/
│   │       └── feature-graphic.png
│   │
├── builds/
│   ├── {schoolId}/
│   │   ├── android/
│   │   │   ├── {buildId}-release.aab      (signed AAB)
│   │   │   └── build-manifest.json
│   │   └── ios/
│   │       ├── {buildId}-release.ipa
│   │       └── build-manifest.json
│   │
└── shared-app/
    ├── android/
    └── ios/
```

### 4.2 Extended Branding API

```csharp
// New endpoint in SettingsController or a new BrandingController
GET /api/mobile/branding           → Returns full mobile branding config
PUT /api/mobile/branding           → School admin updates branding
POST /api/mobile/branding/assets   → Upload new logo/splash

// Response shape
{
  "schoolId": "...",
  "schoolName": "Delhi Public School",
  "appName": "DPS Connect",
  "shortTagline": "Your School in Your Pocket",
  
  "logoUrl": "https://cdn.vitanasms.com/schools/{id}/logo-512.png",
  "appIconUrl": "https://cdn.vitanasms.com/schools/{id}/app-icon-1024.png",
  "splashScreenUrl": "https://cdn.vitanasms.com/schools/{id}/splash-screen.png",
  
  "colors": {
    "primary": "#1a6fd8",
    "accent": "#17a2b8",
    "background": "#ffffff",
    "surface": "#f5f7fa",
    "text": "#1a1a2e",
    "textSecondary": "#6b7280"
  },
  
  "darkMode": {
    "background": "#0d1117",
    "surface": "#161b22",
    "text": "#f0f6fc",
    "textSecondary": "#8b949e"
  },
  
  "fonts": {
    "heading": "Poppins",
    "body": "Inter"
  },
  
  "storeMetadata": {
    "shortDescription": "Official app for DPS families",
    "category": "Education",
    "contactEmail": "support@dps.edu.in",
    "privacyPolicyUrl": "https://dps.edu.in/privacy",
    "websiteUrl": "https://dps.edu.in"
  }
}
```

---

## 5. Build-Time Configuration Injection

The key to white labeling is `app.config.js` — Expo's dynamic app configuration.

### 5.1 Dynamic app.config.js

```javascript
// mobile/app.config.js
const schoolConfigs = require('./scripts/school-configs.json');

module.exports = ({ config }) => {
  const schoolId = process.env.SCHOOL_ID || 'vitana';
  const school = schoolConfigs[schoolId] || schoolConfigs['vitana'];
  
  return {
    ...config,
    name: school.appName,
    slug: school.slug,
    version: process.env.APP_VERSION || '1.0.0',
    
    android: {
      ...config.android,
      package: school.androidPackage,
      versionCode: parseInt(process.env.BUILD_NUMBER || '1'),
      adaptiveIcon: {
        foregroundImage: `./assets/school-assets/${schoolId}/adaptive-icon.png`,
        backgroundColor: school.colors.primary,
      },
    },
    
    ios: {
      ...config.ios,
      bundleIdentifier: school.iosBundleId,
      buildNumber: process.env.BUILD_NUMBER || '1',
      icon: `./assets/school-assets/${schoolId}/app-icon-1024.png`,
    },
    
    splash: {
      image: `./assets/school-assets/${schoolId}/splash-screen.png`,
      backgroundColor: school.colors.primary,
      resizeMode: 'contain',
    },
    
    extra: {
      schoolId: schoolId,
      apiBaseUrl: school.apiDomain,
      schoolName: school.schoolName,
      isWhiteLabel: schoolId !== 'vitana',
      eas: {
        projectId: school.easProjectId || process.env.EAS_PROJECT_ID,
      },
    },
    
    updates: {
      url: `https://u.expo.dev/${school.easProjectId || process.env.EAS_PROJECT_ID}`,
    },
  };
};
```

### 5.2 School Config Registry

```json
// mobile/scripts/school-configs.json
{
  "vitana": {
    "schoolId": "vitana",
    "appName": "Vitana SMS",
    "slug": "vitana-sms",
    "androidPackage": "com.vitana.sms",
    "iosBundleId": "com.vitana.sms",
    "apiDomain": "https://api.vitanasms.com/api",
    "colors": { "primary": "#1a6fd8", "accent": "#17a2b8" },
    "easProjectId": "abc-123-vitana"
  },
  "dps-rohini": {
    "schoolId": "dps-rohini",
    "appName": "DPS Rohini Connect",
    "slug": "dps-rohini-connect",
    "androidPackage": "com.dpsrohini.sms",
    "iosBundleId": "com.dpsrohini.sms",
    "apiDomain": "https://api.vitanasms.com/api",
    "schoolDomain": "dpsrohini.vitanasms.com",
    "colors": { "primary": "#003366", "accent": "#ffd700" },
    "easProjectId": "def-456-dpsrohini"
  }
}
```

### 5.3 Asset Injection Script

```javascript
// mobile/scripts/inject-school-config.js
// Run before EAS build to:
// 1. Download school assets from S3
// 2. Place them in assets/school-assets/{schoolId}/
// 3. Generate app icon variants (adaptive icon, notification icon)

const schoolId = process.argv[2];
// Downloads from S3 bucket school assets
// Runs sharp.js to generate required icon sizes
// Writes school-specific eas.json build profile
```

---

## 6. Runtime Branding

Even with build-time asset injection, colors and branding details update at runtime:

### 6.1 School Theme Provider

```typescript
// src/theme/SchoolThemeProvider.tsx
export function SchoolThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: config } = useAppConfig();
  
  const theme = useMemo(() => ({
    colors: {
      primary: config?.branding.primaryColor ?? '#1a6fd8',
      accent: config?.branding.accentColor ?? '#17a2b8',
      // ... derived tokens
    },
    fonts: {
      heading: config?.branding.fonts?.heading ?? 'Poppins',
      body: config?.branding.fonts?.body ?? 'Inter',
    }
  }), [config]);
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 6.2 Branding in the App Header

```typescript
// src/components/navigation/Header.tsx
export function AppHeader() {
  const { data: config } = useAppConfig();
  
  return (
    <View style={styles.header}>
      <Image 
        source={{ uri: config?.branding.logoUrl }}
        style={styles.logo}
        contentFit="contain"
      />
      <Text style={styles.schoolName}>{config?.branding.schoolName}</Text>
    </View>
  );
}
```

---

## 7. Shared App Branding Mode

In the Shared Vitana App, branding is applied after login:

```
Before Login: Vitana logo + blue theme
              ↓
User enters school domain / school code
              ↓
GET /api/settings/public-branding (with school domain)
              ↓
Login screen updates: school logo, school colors
              ↓
After Login: Full school branding applied globally
```

When the user logs out, the theme resets to Vitana defaults.

---

## 8. Dedicated App Branding Mode

In a dedicated school app:
- App icon, splash, and app name are baked in at build time.
- School domain is hardcoded in `app.config.js` `extra.schoolDomain`.
- No school-selection screen shown.
- `GET /api/settings/public-branding` is called but supplementary (runtime color updates).

```typescript
// src/stores/schoolStore.ts
const isWhiteLabel = Constants.expoConfig?.extra?.isWhiteLabel ?? false;
const hardcodedDomain = Constants.expoConfig?.extra?.schoolDomain;

// In shared app: user enters domain
// In white label: domain is pre-loaded from Constants
```

---

## 9. OTA Updates and White Label

OTA updates via Expo EAS Update are **channel-based**:

```json
// eas.json
{
  "builds": {
    "dps-rohini-production": {
      "channel": "dps-rohini-production"
    },
    "vitana-production": {
      "channel": "vitana-production"
    }
  },
  "updates": {
    "channel": "production"
  }
}
```

This means:
- An OTA update to `vitana-production` channel reaches only Vitana Shared App users.
- An OTA update to `dps-rohini-production` reaches only DPS Rohini app users.
- OTA updates cannot change binary assets (icons, splash) — only JS code and JSON configs.
- School branding colors and copy can be updated OTA via the runtime `app-config` API.

---

## 10. White Label Onboarding Process

When a new school purchases the dedicated app tier:

```
Step 1: School Admin uploads assets via School Settings → Mobile Branding
        (logo 1024×1024 PNG, splash 2048×2048 PNG, hex colors)

Step 2: Vitana ops reviews assets (24h SLA)

Step 3: Vitana DevOps runs:
        - inject-school-config.js {schoolId}
        - Downloads assets, generates icon variants
        - Adds school entry to school-configs.json

Step 4: EAS Build triggered via GitHub Actions:
        SCHOOL_ID={schoolId} eas build --profile school-production

Step 5: Android AAB uploaded to Google Play Console (New App or existing track)
        iOS IPA uploaded to App Store Connect

Step 6: Store review period (Android: 1–3 days, iOS: 1–7 days)

Step 7: App goes live. School notified with store URLs.

Total time: 2–8 business days (mostly store review time)
```

---

## 11. Asset Pipeline

```
School uploads logo.png
         │
         ▼
S3 upload (original, immutable)
         │
         ▼
Lambda/Container image processor:
├── Resize to 512×512 (logo for app)
├── Resize to 1024×1024 (app icon)
├── Generate Android adaptive icon (foreground + background layers)
├── Generate notification small icon (white silhouette on transparent)
├── Generate 2048×2048 splash screen with logo centered
└── Generate store screenshots (inject logo into template screenshots)
         │
         ▼
Processed assets stored in S3 school branding bucket
         │
         ▼
inject-school-config.js downloads to mobile/assets/school-assets/{schoolId}/
         │
         ▼
EAS Build uses assets at build time
```

---

## 12. Tradeoffs & Decisions

| Question | Decision | Reasoning |
|---|---|---|
| **One EAS project per school or one shared?** | One EAS project per dedicated school app | Separate update channels, separate crash reports, separate analytics. ~$3/month per project on EAS. |
| **School stores own developer account or use Vitana's?** | Vitana's accounts initially; migrate to school's on request | Faster setup. Schools can later transfer ownership. |
| **Store listing per school or single developer page?** | Separate store page per school app | Each school's app appears under their name, not Vitana's |
| **Dark mode support** | Yes, from launch for dedicated apps | Runtime via `darkMode` color block in branding config |
| **Font customization** | Phase 2 | Phase 1: Inter + Poppins. Phase 2: allow custom Google Font selection |

---

*Next: [09-push-notification-architecture.md](./09-push-notification-architecture.md)*
