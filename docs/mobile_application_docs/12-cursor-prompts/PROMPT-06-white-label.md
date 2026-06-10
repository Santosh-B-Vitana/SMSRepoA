# PROMPT-06: White Label Architecture Implementation

> **Prompt ID:** PROMPT-06  
> **Epic:** EP-10 — White Label Architecture  
> **Phase:** 3 — Sprints 11–13  
> **Estimated Story Points:** 34  
> **Prerequisites:** PROMPT-01 complete; Parent + Teacher apps in beta  
> **Related Architecture Docs:** [08-white-label-architecture](../08-white-label-architecture.md) · [11-build-automation](../11-build-automation.md)

---

## Context

The shared Vitana App is in beta. Now implement the white-label system that allows generating dedicated school-branded apps from the same codebase.

**Key requirement:** A Vitana DevOps engineer should be able to onboard a new school's dedicated app by:
1. Running one script to download school assets.
2. Triggering one GitHub Actions workflow dispatch.
3. Receiving the build within 30 minutes.

Read `docs/mobile_application_docs/08-white-label-architecture.md` completely before implementing.

---

## Requirements

### 1. Dynamic `app.config.js`

Refactor to read `SCHOOL_ID` environment variable and look up school config:

```javascript
// mobile/app.config.js
const path = require('path');
let schoolConfigs;
try {
  schoolConfigs = require('./scripts/school-configs.json');
} catch {
  schoolConfigs = {};
}

module.exports = ({ config }) => {
  const schoolId = process.env.SCHOOL_ID || 'vitana';
  const school = schoolConfigs[schoolId] || {
    schoolId: 'vitana',
    appName: 'Vitana SMS',
    slug: 'vitana-sms',
    androidPackage: 'com.vitana.sms',
    iosBundleId: 'com.vitana.sms',
    apiDomain: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.vitanasms.com/api',
    colors: { primary: '#1a6fd8', accent: '#17a2b8' },
    easProjectId: process.env.EAS_PROJECT_ID,
    isWhiteLabel: false,
  };
  
  const assetBase = `./assets/school-assets/${schoolId}`;
  
  return {
    ...config,
    name: school.appName,
    slug: school.slug,
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    
    splash: {
      image: `${assetBase}/splash-screen.png`,
      backgroundColor: school.colors.primary,
      resizeMode: 'contain',
    },
    
    android: {
      ...config.android,
      package: school.androidPackage,
      versionCode: parseInt(process.env.BUILD_NUMBER || '1'),
      adaptiveIcon: {
        foregroundImage: `${assetBase}/adaptive-icon.png`,
        backgroundColor: school.colors.primary,
      },
    },
    
    ios: {
      ...config.ios,
      bundleIdentifier: school.iosBundleId,
      buildNumber: process.env.BUILD_NUMBER || '1',
      icon: `${assetBase}/app-icon-1024.png`,
    },
    
    extra: {
      schoolId,
      isWhiteLabel: school.isWhiteLabel || false,
      schoolDomain: school.schoolDomain || null,
      apiBaseUrl: school.apiDomain,
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

### 2. School Assets Directory

Create the default Vitana assets at:
```
mobile/assets/school-assets/
└── vitana/
    ├── app-icon-1024.png     (Vitana logo 1024×1024)
    ├── adaptive-icon.png     (Android adaptive foreground)
    ├── splash-screen.png     (Vitana splash)
    └── notification-icon.png (White silhouette for notifications)
```

All school-specific asset directories will be created by `inject-school-config.js`. Add `mobile/assets/school-assets/*/` to `.gitignore` (except `vitana/`).

### 3. Asset Injection Script (`mobile/scripts/inject-school-config.js`)

```javascript
#!/usr/bin/env node
// Usage: node scripts/inject-school-config.js <schoolId>
// Downloads school assets from S3 and creates directory structure

const schoolId = process.argv[2];
// 1. Validate schoolId exists in school-configs.json
// 2. Fetch branding config from S3: s3://vitana-assets/schools/{schoolId}/branding/branding-config.json
// 3. Download assets: app-icon-1024.png, adaptive-icon.png, splash-screen.png, notification-icon.png
// 4. Place in mobile/assets/school-assets/{schoolId}/
// 5. Validate assets: correct dimensions, PNG format
// 6. Generate EAS build channel name: "{schoolId}-production"
// 7. Log success with asset paths
```

Uses: `@aws-sdk/client-s3`, `sharp` (for image validation and resizing).

### 4. School Configs Registry (`mobile/scripts/school-configs.json`)

```json
{
  "vitana": {
    "schoolId": "vitana",
    "appName": "Vitana SMS",
    "slug": "vitana-sms",
    "androidPackage": "com.vitana.sms",
    "iosBundleId": "com.vitana.sms",
    "apiDomain": "https://api.vitanasms.com/api",
    "colors": { "primary": "#1a6fd8", "accent": "#17a2b8" },
    "easProjectId": "FILL_FROM_EAS",
    "isWhiteLabel": false
  }
}
```

This file is committed to the repository. New schools are added here during onboarding.

### 5. Runtime Branding in Shared App

In the shared app, branding updates after login. Implement in `src/theme/SchoolThemeProvider.tsx`:

```typescript
export function SchoolThemeProvider({ children }: { children: React.ReactNode }) {
  const { branding } = useSchoolStore();
  const isWhiteLabel = Constants.expoConfig?.extra?.isWhiteLabel ?? false;
  
  // In white-label apps, some branding is set at build time
  // In shared app, all branding comes from the server post-login
  
  const theme = useMemo<AppTheme>(() => ({
    colors: {
      primary: branding?.primaryColor ?? Constants.expoConfig?.extra?.buildTimeColor ?? '#1a6fd8',
      accent: branding?.accentColor ?? '#17a2b8',
      // Derived tokens
      primaryLight: lightenColor(branding?.primaryColor ?? '#1a6fd8', 0.2),
      primaryDark: darkenColor(branding?.primaryColor ?? '#1a6fd8', 0.2),
      surface: '#ffffff',
      background: '#f5f7fa',
    },
    fonts: {
      heading: branding?.fonts?.heading ?? 'Poppins',
      body: branding?.fonts?.body ?? 'Inter',
    },
  }), [branding]);
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
```

**Color utilities (`src/theme/utils.ts`):**
- `lightenColor(hex, amount)`: lighten hex color.
- `darkenColor(hex, amount)`: darken hex color.
- `hexToRGBA(hex, alpha)`: for transparent overlays.
- `isLightColor(hex) → bool`: for determining text color on background.

### 6. App Header with School Branding

Update all role tab navigators to use a branded header:

```typescript
// src/components/navigation/AppHeader.tsx
export function AppHeader({ title }: { title?: string }) {
  const { branding } = useSchoolStore();
  const { colors } = useAppTheme();
  
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <Image
        source={{ uri: branding?.logoUrl }}
        style={styles.logo}
        contentFit="contain"
        placeholder={require('../../assets/school-assets/vitana/app-icon-1024.png')}
      />
      {title && <Text style={styles.title}>{title}</Text>}
      <NotificationBell />
    </View>
  );
}
```

### 7. Extended Branding API (Backend)

Coordinate with backend team to create:
```
GET /api/mobile/branding
→ Returns full SchoolBranding object (logo, colors, fonts, splash, store metadata)

PUT /api/mobile/branding  (Admin only)
→ School admin updates branding config

POST /api/mobile/branding/assets  (Admin only)
→ Upload new logo or splash screen
```

Store extended branding in a new `MobileAppBranding` table in AppDbContext.

### 8. White Label Toggle in Mobile

```typescript
// src/lib/whiteLabel.ts
export const isWhiteLabelApp = Constants.expoConfig?.extra?.isWhiteLabel ?? false;
export const hardcodedSchoolDomain = Constants.expoConfig?.extra?.schoolDomain ?? null;

// In auth flow:
// - Shared app: show school domain entry screen
// - White label: skip domain entry, use hardcodedSchoolDomain
```

---

## Implementation Tasks

1. Refactor `app.config.js` for dynamic school injection.
2. Create `mobile/scripts/school-configs.json` with `vitana` entry.
3. Create default Vitana assets in `assets/school-assets/vitana/`.
4. Implement `mobile/scripts/inject-school-config.js`.
5. Implement `SchoolThemeProvider` with full color token generation.
6. Implement `AppHeader` with dynamic branding.
7. Apply `AppHeader` to all role tab navigators.
8. Implement color utilities.
9. Implement `isWhiteLabelApp` toggle in auth flow.
10. Update `app/(auth)/index.tsx` to skip for white-label apps.
11. Add `mobile/assets/school-assets/*/` to `.gitignore`.
12. Coordinate with backend team for `GET /api/mobile/branding` endpoint.
13. Test building with `SCHOOL_ID=vitana` (default).

---

## Acceptance Criteria

- [ ] `SCHOOL_ID=vitana eas build --profile preview` builds successfully.
- [ ] App icon, splash, and colors match the `vitana` entry in school-configs.json.
- [ ] In shared app: school domain entry shown, branding loads post-login.
- [ ] In white-label mode (`isWhiteLabel=true`): domain entry skipped.
- [ ] Primary color applied to tab bar active indicator, header, and primary buttons.
- [ ] School logo appears in app header post-login.
- [ ] `inject-school-config.js` downloads assets and validates dimensions.
- [ ] Color utilities correctly lighten/darken hex colors.
- [ ] School branding resets on logout in shared app.

---

## Testing Requirements

- Build test: `SCHOOL_ID=vitana eas build --platform android --profile preview --local`.
- Visual test: Compare app icon and splash on physical device.
- Branding test: Change school primaryColor in backend → log out → log in → verify new color.
- Color utility unit tests.

---

## Definition of Done

- [ ] `inject-school-config.js` fully functional.
- [ ] `app.config.js` generates correct config for both `vitana` and a test school.
- [ ] Branding applies consistently across all screens.
- [ ] First dedicated school app builds successfully with real school assets.
- [ ] Peer review complete.
