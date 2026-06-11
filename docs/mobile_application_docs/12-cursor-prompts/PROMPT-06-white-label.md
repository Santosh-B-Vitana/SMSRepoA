# PROMPT-06: White Label Architecture

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-10 — White Label Architecture  
> **Sprint**: 11–13 (Weeks 21–26)  
> **Story Points**: 34  
> **Prerequisites**: PROMPT-01 ✓ (app.config.js stub exists)  
> **Next Prompt**: PROMPT-07 (Build Automation) — depends on this  
> **Goal**: One codebase → unlimited branded school apps with one command

---

## PHASE 1: Context & Scope

> **WHITE-LABEL ARCHITECTURE PRINCIPLE — ONE APP PER SCHOOL**
>
> A white-label build produces **ONE app** for the school (`com.<school>.sms`). That single binary serves ALL roles at that school — parents, teachers, students, and admins all use the same app. They log in, the JWT role is read, and they are routed to their portal.
>
> **Do NOT create 3 separate white-label binaries per school** (one for parents, one for teachers, one for students). One binary, one store listing, one update channel per school.
>
> | Variant | Binary | Serves |
> |---|---|---|
> | Shared Vitana app | `com.vitana.sms` | All schools, all roles |
> | School white-label app | `com.<school>.sms` | That school, all roles |

### What We're Building

The complete white-label system that allows Vitana to generate a fully-branded dedicated school app (different icon, splash, app name, colors, package name) by running one command — while the shared Vitana app continues to work as-is.

**Capabilities:**
- Dynamic `app.config.js` that reads `SCHOOL_ID` environment variable
- `school-configs.json` registry with per-school settings
- `inject-school-config.js` script that downloads school assets from S3
- Build-time asset injection (icon, splash, package name)
- Runtime branding (colors, logo, school name from `GET /api/mobile/app-config`)
- Shared app: shows Vitana branding before login, school branding after login
- White-label app: school branding everywhere from first launch; ONE binary serves all roles
- `SchoolThemeProvider` that applies dynamic colors to all UI components
- Extended branding API in backend

### Current State

- ✅ `app.config.js` stub exists (basic, not dynamic)
- ✅ `schoolStore` with branding fields
- ✅ Default Vitana assets placeholder in `assets/school-assets/vitana/`
- ✅ Tab bars reference `branding.primaryColor` (hardcoded fallback)
- ❌ Dynamic school config injection not built
- ❌ `inject-school-config.js` not implemented
- ❌ `school-configs.json` not implemented
- ❌ `SchoolThemeProvider` not fully built
- ❌ Extended branding API not built

### Success Criteria

- [ ] `SCHOOL_ID=vitana` build produces Vitana branded app
- [ ] `SCHOOL_ID=test-school` build produces test school branded app (different icon, splash, colors)
- [ ] In shared app: Vitana branding before login; school branding after login
- [ ] In white-label app: school branding visible on first launch (splash + icon)
- [ ] Primary color applied to: tab bar active, header background, primary buttons, badges
- [ ] School logo appears in app header after login
- [ ] Branding resets to Vitana defaults on logout (shared app only)
- [ ] `inject-school-config.js test-school` downloads assets and creates directory
- [ ] `pnpm --filter @vitana/mobile start` works with no `SCHOOL_ID` set (defaults to vitana)

---

## PHASE 2: Analysis Phase

### Read First

```bash
docs/mobile_application_docs/08-white-label-architecture.md
docs/mobile_application_docs/epics/EP-10-white-label.md
```

### Existing Code Audit

```bash
# Check current app.config.js
cat mobile/app.config.js

# Verify assets directory structure
ls mobile/assets/school-assets/
# Should have: vitana/ directory with placeholder files

# Check that schoolStore has setBranding
grep "setBranding\|setAppConfig" mobile/src/stores/schoolStore.ts

# Check all tab navigators use primaryColor from store (not hardcoded)
grep -r "primaryColor\|#1a6fd8" mobile/app/\(parent\)/_layout.tsx
grep -r "primaryColor\|#1a6fd8" mobile/app/\(teacher\)/_layout.tsx
```

### Web Design System Source

```bash
# Extract EXACT color values from web app
cat ui/tailwind.config.js
# We must match these exactly in mobile
```

---

## PHASE 3: Technical Planning

### 3.1 Build-Time vs Runtime Branding

| Asset | When Applied | How |
|---|---|---|
| App icon | Build-time only | `app.config.js` → `ios.icon` / `android.adaptiveIcon` |
| Splash screen | Build-time only | `app.config.js` → `splash.image` |
| App name | Build-time only | `app.config.js` → `name` |
| Package name | Build-time only | `app.config.js` → `android.package` / `ios.bundleIdentifier` |
| Primary color | Build-time + Runtime | Default from `app.config.js`, overridden by `app-config` API |
| School logo (header) | Runtime | From `app-config` API → `schoolStore.branding.logoUrl` |
| School name | Runtime | From `app-config` API → `schoolStore.branding.schoolName` |
| Accent color | Runtime | From `app-config` API |

### 3.2 School Config Structure

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
    "isWhiteLabel": false,
    "easProjectId": "REPLACE_ME"
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
    "isWhiteLabel": true,
    "easProjectId": "REPLACE_ME"
  }
}
```

---

## PHASE 4: Database Design

### Backend — Extended Branding Table

```csharp
// Migration: Add MobileAppBranding table
public class MobileAppBranding
{
    public Guid Id { get; set; }
    public Guid SchoolId { get; set; }
    public string? AppName { get; set; }
    public string? AppIconUrl { get; set; }      // 1024×1024 PNG on S3
    public string? SplashScreenUrl { get; set; } // 2048×2048 PNG on S3
    public string PrimaryColor { get; set; } = "#1a6fd8";
    public string AccentColor { get; set; } = "#17a2b8";
    public string? FontHeading { get; set; }
    public string? FontBody { get; set; }
    public string? StoreShortDescription { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Guid UpdatedBy { get; set; }
}
```

---

## PHASE 5: Backend Implementation

### Extended Branding Endpoint

```csharp
// GET /api/mobile/branding
[HttpGet("mobile/branding")]
[Authorize]
public async Task<IActionResult> GetMobileBranding()
{
    var branding = await _dbContext.MobileAppBrandings
        .FirstOrDefaultAsync(b => b.SchoolId == _schoolId);

    var settings = await _settingsService.GetPublicBrandingAsync(_schoolId);

    return Ok(new {
        schoolName = settings.SchoolName,
        logoUrl = settings.LogoUrl,
        primaryColor = branding?.PrimaryColor ?? settings.PrimaryColor ?? "#1a6fd8",
        accentColor = branding?.AccentColor ?? "#17a2b8",
        appIconUrl = branding?.AppIconUrl,
        splashScreenUrl = branding?.SplashScreenUrl,
        fonts = new { heading = branding?.FontHeading ?? "Poppins", body = branding?.FontBody ?? "Inter" },
    });
}

// PUT /api/mobile/branding (Admin only)
[HttpPut("mobile/branding")]
[Authorize(Roles = "Admin,Principal")]
public async Task<IActionResult> UpdateMobileBranding([FromBody] UpdateBrandingRequest request)
{
    var existing = await _dbContext.MobileAppBrandings
        .FirstOrDefaultAsync(b => b.SchoolId == _schoolId);

    if (existing == null)
    {
        _dbContext.MobileAppBrandings.Add(new MobileAppBranding {
            Id = Guid.NewGuid(), SchoolId = _schoolId,
            PrimaryColor = request.PrimaryColor, AccentColor = request.AccentColor,
            AppName = request.AppName, UpdatedAt = DateTime.UtcNow, UpdatedBy = _userId,
        });
    }
    else
    {
        existing.PrimaryColor = request.PrimaryColor;
        existing.AccentColor = request.AccentColor;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.UpdatedBy = _userId;
    }

    await _dbContext.SaveChangesAsync();
    return Ok();
}
```

---

## PHASE 6: Mobile Implementation

### 6.1 Dynamic app.config.js (Complete)

```javascript
// mobile/app.config.js
const path = require('path');

let schoolConfigs = {};
try {
  schoolConfigs = require('./scripts/school-configs.json');
} catch {
  // Not yet created — use defaults
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
    isWhiteLabel: false,
  };

  const assetBase = `./assets/school-assets/${schoolId}`;

  return {
    ...config,
    name: school.appName,
    slug: school.slug,
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'vitanasms',
    newArchEnabled: true,

    icon: `${assetBase}/app-icon-1024.png`,

    splash: {
      image: `${assetBase}/splash-screen.png`,
      backgroundColor: school.colors.primary,
      resizeMode: 'contain',
    },

    android: {
      package: school.androidPackage,
      versionCode: parseInt(process.env.BUILD_NUMBER || '1'),
      adaptiveIcon: {
        foregroundImage: `${assetBase}/adaptive-icon.png`,
        backgroundColor: school.colors.primary,
      },
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      permissions: [
        'android.permission.USE_BIOMETRIC', 'android.permission.USE_FINGERPRINT',
        'android.permission.CAMERA', 'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
      ],
    },

    ios: {
      bundleIdentifier: school.iosBundleId,
      buildNumber: process.env.BUILD_NUMBER || '1',
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: 'Camera is used to upload photos.',
        NSFaceIDUsageDescription: 'Face ID is used to unlock the app.',
        NSPhotoLibraryUsageDescription: 'Photo library access for uploading.',
      },
    },

    plugins: [
      'expo-router',
      ['expo-secure-store', {}],
      ['expo-local-authentication', {
        faceIDPermission: 'Vitana SMS uses Face ID to securely unlock the app.',
      }],
      ['expo-notifications', {
        icon: `${assetBase}/notification-icon.png`,
        color: school.colors.primary,
      }],
      'expo-sqlite',
      '@react-native-firebase/app',
    ],

    extra: {
      schoolId,
      isWhiteLabel: school.isWhiteLabel || false,
      schoolDomain: school.schoolDomain || null,
      buildTimePrimaryColor: school.colors.primary,
      buildTimeAccentColor: school.colors.accent,
      buildTimeAppName: school.appName,
      eas: {
        projectId: school.easProjectId || process.env.EAS_PROJECT_ID,
      },
    },

    updates: {
      url: `https://u.expo.dev/${school.easProjectId || process.env.EAS_PROJECT_ID || 'REPLACE'}`,
      enabled: true,
      fallbackToCacheTimeout: 0,
      runtimeVersion: { policy: 'sdkVersion' },
    },

    experiments: { typedRoutes: true },
  };
};
```

### 6.2 School Asset Injection Script

```javascript
// mobile/scripts/inject-school-config.js
#!/usr/bin/env node
/**
 * Usage: node scripts/inject-school-config.js <schoolId>
 * Downloads school assets from S3 and places them in assets/school-assets/<schoolId>/
 */

const schoolId = process.argv[2];
if (!schoolId) {
  console.error('Usage: node inject-school-config.js <schoolId>');
  process.exit(1);
}

const path = require('path');
const fs = require('fs');
const https = require('https');

const configs = require('./school-configs.json');
const school = configs[schoolId];
if (!school) {
  console.error(`School "${schoolId}" not found in school-configs.json`);
  console.log('Available schools:', Object.keys(configs).join(', '));
  process.exit(1);
}

const assetsDir = path.join(__dirname, '..', 'assets', 'school-assets', schoolId);

// Create directory
fs.mkdirSync(assetsDir, { recursive: true });

// If school has S3 asset URLs, download them
// Otherwise, copy from default vitana assets
const defaultDir = path.join(__dirname, '..', 'assets', 'school-assets', 'vitana');
const requiredFiles = [
  'app-icon-1024.png',
  'adaptive-icon.png',
  'splash-screen.png',
  'notification-icon.png',
];

requiredFiles.forEach(file => {
  const targetPath = path.join(assetsDir, file);
  if (!fs.existsSync(targetPath)) {
    // Copy from default if school hasn't provided custom assets yet
    const defaultPath = path.join(defaultDir, file);
    if (fs.existsSync(defaultPath)) {
      fs.copyFileSync(defaultPath, targetPath);
      console.log(`[${schoolId}] Copied default ${file}`);
    } else {
      console.warn(`[${schoolId}] Missing asset: ${file} — create in ${assetsDir}`);
    }
  } else {
    console.log(`[${schoolId}] ${file} already exists`);
  }
});

// Write a school info file for reference
fs.writeFileSync(
  path.join(assetsDir, 'config.json'),
  JSON.stringify({ ...school, injectedAt: new Date().toISOString() }, null, 2)
);

console.log(`\n✅ School assets ready for: ${school.appName} (${schoolId})`);
console.log(`   Package: ${school.androidPackage}`);
console.log(`   Primary: ${school.colors.primary}`);
console.log(`\nNext step: SCHOOL_ID=${schoolId} pnpm --filter @vitana/mobile start`);
console.log(`Or build:   SCHOOL_ID=${schoolId} eas build --profile school-production\n`);
```

### 6.3 School Theme Provider (Complete)

```typescript
// mobile/src/theme/SchoolThemeProvider.tsx
import { createContext, useContext, useMemo, ReactNode } from 'react';
import Constants from 'expo-constants';
import { useSchoolStore } from '../stores/schoolStore';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

interface AppTheme {
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    navy: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  };
  fonts: { heading: string; body: string };
  schoolName: string;
  logoUrl: string | null;
}

const ThemeContext = createContext<AppTheme | null>(null);

function hexToRGB(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function lightenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRGB(hex);
  return `rgb(${Math.min(255, r + (255 - r) * amount)}, ${Math.min(255, g + (255 - g) * amount)}, ${Math.min(255, b + (255 - b) * amount)})`;
}

function darkenColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRGB(hex);
  return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
}

export function SchoolThemeProvider({ children }: { children: ReactNode }) {
  const { branding } = useSchoolStore();
  const buildTimePrimary = Constants.expoConfig?.extra?.buildTimePrimaryColor as string | undefined;

  const theme = useMemo<AppTheme>(() => {
    const primary = branding?.primaryColor ?? buildTimePrimary ?? VITANA_DESIGN_TOKENS.colors.primary;
    const accent = branding?.accentColor ?? VITANA_DESIGN_TOKENS.colors.accent;

    return {
      colors: {
        primary,
        primaryLight: lightenColor(primary, 0.85),
        primaryDark: darkenColor(primary, 0.2),
        accent,
        navy: VITANA_DESIGN_TOKENS.colors.navy,
        background: VITANA_DESIGN_TOKENS.colors.background,
        surface: VITANA_DESIGN_TOKENS.colors.surface,
        textPrimary: VITANA_DESIGN_TOKENS.colors.textPrimary,
        textSecondary: VITANA_DESIGN_TOKENS.colors.textSecondary,
        border: VITANA_DESIGN_TOKENS.colors.border,
        success: VITANA_DESIGN_TOKENS.colors.success,
        warning: VITANA_DESIGN_TOKENS.colors.warning,
        danger: VITANA_DESIGN_TOKENS.colors.danger,
      },
      fonts: {
        heading: branding?.fonts?.heading ?? 'Poppins',
        body: branding?.fonts?.body ?? 'Inter',
      },
      schoolName: branding?.schoolName ?? Constants.expoConfig?.extra?.buildTimeAppName ?? 'Vitana SMS',
      logoUrl: branding?.logoUrl ?? null,
    };
  }, [branding, buildTimePrimary]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useAppTheme must be used inside SchoolThemeProvider');
  return theme;
}
```

### 6.4 Update Root Layout

```typescript
// mobile/app/_layout.tsx — WRAP everything in SchoolThemeProvider
import { SchoolThemeProvider } from '../src/theme/SchoolThemeProvider';

// Inside RootLayout return:
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SchoolThemeProvider>
      <QueryClientProvider client={queryClient}>
        {/* existing content */}
      </QueryClientProvider>
    </SchoolThemeProvider>
  </GestureHandlerRootView>
);
```

### 6.5 Update All Tab Navigators

All tab navigators must use `useAppTheme()` instead of hardcoded colors:

```typescript
// Replace in ALL _layout.tsx files:
// BEFORE:
const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

// AFTER:
import { useAppTheme } from '../../../src/theme/SchoolThemeProvider';
const { colors } = useAppTheme();
// Use: colors.primary (instead of primaryColor variable)
```

### 6.6 White-Label Auth Check in Domain Entry

```typescript
// mobile/app/(auth)/index.tsx — update isWhiteLabel check
import Constants from 'expo-constants';
const isWhiteLabel = Constants.expoConfig?.extra?.isWhiteLabel ?? false;
const hardcodedDomain = Constants.expoConfig?.extra?.schoolDomain ?? null;

useEffect(() => {
  if (isWhiteLabel && hardcodedDomain) {
    // Skip domain entry — store the domain and go to login
    SecureStore.setItemAsync('school_domain', hardcodedDomain)
      .then(() => router.replace('/(auth)/login'));
  }
}, []);
```

### 6.7 Add school-configs.json and Script to .gitignore/Package

```json
// mobile/package.json — add scripts
"scripts": {
  "inject:school": "node scripts/inject-school-config.js"
}
```

```bash
# .gitignore — add
mobile/assets/school-assets/*/
!mobile/assets/school-assets/vitana/
mobile/scripts/school-configs.json  # Contains school details — keep out of git
```

> **Note**: `school-configs.json` should be managed in a private repo or secrets manager. The file in this prompt is a template.

---

## PHASE 7: AI/ML Integration

> Not applicable.

---

## PHASE 8: External Integrations

### AWS S3 (Asset Storage)

For production, `inject-school-config.js` downloads assets from S3:

```javascript
// Extend inject-school-config.js with AWS S3 support:
// const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
// Download: s3://vitana-assets/schools/{schoolId}/branding/app-icon-1024.png
// etc.
// For now, the script copies from default vitana assets if no S3 configured
```

---

## PHASE 9: Testing & Validation

### 9.1 Tests

```typescript
// mobile/src/theme/__tests__/SchoolThemeProvider.test.tsx
import { renderHook } from '@testing-library/react-native';
import { SchoolThemeProvider, useAppTheme } from '../SchoolThemeProvider';
import { useSchoolStore } from '../../stores/schoolStore';

describe('SchoolThemeProvider', () => {
  it('returns default Vitana colors when no branding set', () => {
    const { result } = renderHook(() => useAppTheme(), {
      wrapper: ({ children }) => <SchoolThemeProvider>{children}</SchoolThemeProvider>,
    });
    expect(result.current.colors.primary).toBe('#1a6fd8');
  });

  it('returns school colors when branding set', () => {
    useSchoolStore.getState().setAppConfig({
      schoolId: 'test',
      academicYear: '2025-2026',
      branding: { schoolName: 'Test', logoUrl: null, primaryColor: '#ff0000', accentColor: '#00ff00' },
      modules: {} as any,
      mobileFeatures: {} as any,
      rolePermissions: {} as any,
      remoteConfig: {} as any,
      versionRequirements: {} as any,
    });
    const { result } = renderHook(() => useAppTheme(), {
      wrapper: ({ children }) => <SchoolThemeProvider>{children}</SchoolThemeProvider>,
    });
    expect(result.current.colors.primary).toBe('#ff0000');
  });
});
```

### 9.2 Validation Checklist

- [ ] `SCHOOL_ID=vitana pnpm --filter @vitana/mobile start` → Vitana branding
- [ ] `SCHOOL_ID=test-school pnpm --filter @vitana/mobile start` → test-school assets loaded
- [ ] `node scripts/inject-school-config.js test-school` → creates assets directory
- [ ] In shared app: login → school logo appears in header
- [ ] In shared app: logout → Vitana logo restores in header
- [ ] White-label app: skip domain entry screen (verify via `isWhiteLabel=true` in Constants)
- [ ] Primary color applied consistently: tab bar, header, buttons, badges
- [ ] `useAppTheme()` returns correct values before and after `setAppConfig`

---

## PHASE 10: Documentation & Verification

### Git Commit

```bash
git add .
git commit -m "feat(mobile/white-label): dynamic school branding system

- app.config.js fully dynamic: reads SCHOOL_ID env var
- school-configs.json registry for all school configurations
- inject-school-config.js: asset injection script
- SchoolThemeProvider: dynamic color tokens (primaryLight/Dark derived)
- All tab navigators use useAppTheme() — no hardcoded colors
- White-label apps skip domain entry screen
- Shared app resets to Vitana on logout
- Backend: MobileAppBranding table + GET/PUT /api/mobile/branding
- lightenColor/darkenColor utilities for derived tokens

To build a school app: SCHOOL_ID=<id> eas build --profile school-production
Next: PROMPT-07 (Build Automation CI/CD)"
```

---

**END OF PROMPT-06**
