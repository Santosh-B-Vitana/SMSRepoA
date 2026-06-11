# Vitana Mobile Platform — Technology Recommendation

> **Classification:** Internal Architecture Document  
> **Version:** 1.0  
> **Date:** June 2026  
> **Related Docs:** [01-executive-summary](./01-executive-summary.md) · [05-repository-strategy](./05-repository-strategy.md) · [06-mobile-architecture](./06-mobile-architecture.md)

---

## 1. Decision

> **React Native with Expo SDK 52 is the selected framework.**

This document explains how we arrived at this decision and why the alternatives were rejected.

---

## 2. Comparison Matrix

### 2.1 Frameworks Evaluated

| Criterion | React Native + Expo | Flutter | Kotlin Multiplatform (KMP) |
|---|---|---|---|
| **Language** | TypeScript / JavaScript | Dart | Kotlin |
| **Existing Team Fit** | ★★★★★ — Team writes React 19 / TypeScript today | ★★☆☆☆ — New language, new paradigm | ★☆☆☆☆ — Entirely different language |
| **Time to First App** | Weeks (shared web knowledge) | Months (Dart learning curve) | Months–Years (iOS = SwiftUI, Android = Compose) |
| **Code Sharing with Web** | ★★★★★ — Share types, hooks, API layer | ★☆☆☆☆ — Nothing shared | ★★☆☆☆ — Kotlin logic; no UI sharing |
| **Android Support** | Excellent (JSI, Hermes engine) | Excellent (Skia renderer) | Excellent (native) |
| **iOS Support** | Excellent | Excellent | Excellent |
| **OTA Updates** | ★★★★★ — Expo EAS Update (JS bundle only) | ★☆☆☆☆ — No OTA; every change needs store review | ★★☆☆☆ — Logic OTA possible; UI cannot |
| **White Label Support** | ★★★★★ — EAS build profiles + config injection | ★★★★☆ — Flutter flavors, more complex CI | ★★★☆☆ — Requires per-platform white-label work |
| **Performance** | ★★★★☆ — Hermes JIT, JSI for native modules | ★★★★★ — Compiled Dart + Skia (smoother animations) | ★★★★★ — Native UI |
| **Community Size** | Largest (Meta + Microsoft + Expo ecosystem) | Growing rapidly | Niche (no shared UI — only logic) |
| **NPM Package Ecosystem** | ★★★★★ — Access to entire npm registry | ★★★☆☆ — pub.dev smaller | ★★☆☆☆ — Kotlin-only packages |
| **Hiring Pool (India)** | ★★★★★ — React/React Native common in Indian market | ★★★☆☆ — Growing but smaller | ★★☆☆☆ — Rare in India |
| **CI/CD Maturity** | ★★★★★ — EAS + GitHub Actions, Fastlane, Bitrise all support RN | ★★★★☆ — Codemagic excels at Flutter | ★★★☆☆ — Complex per-platform pipelines |
| **Crash Reporting / Monitoring** | Sentry, Bugsnag, Firebase Crashlytics all first-class | Same | Same |
| **Long-Term Viability** | ★★★★★ — Meta maintains, huge adoption (Meta, Shopify, Walmart) | ★★★★★ — Google maintains, accelerating | ★★★★☆ — JetBrains + Google, early-stage |
| **Offline / SQLite** | expo-sqlite, WatermelonDB, MMKV | sqflite, Hive, ObjectBox | SQLDelight |
| **Deep Linking** | Expo Router v4 (file-based, URL-based) | go_router | Platform-specific |

---

## 3. Detailed Analysis

### 3.1 React Native + Expo

**Why it fits Vitana perfectly:**

1. **Existing team competency.** The web team writes React 19 + TypeScript. React Native is React applied to mobile. The paradigm shift is from `<div>` to `<View>` — not from JavaScript to Dart. Team productivity from day one.

2. **Shared codebase with web.** TanStack Query hooks, API client, TypeScript interfaces, validation schemas, and business logic can all be shared between the web and mobile apps via a monorepo workspace setup. This is a multiplier on every hour of backend work.

3. **Expo EAS — the strongest OTA story in mobile.** When a school requests a change to their branding or a bug is fixed, the JS bundle can be deployed OTA without App Store/Play Store review. Schools get updates within minutes, not days. Flutter has no equivalent.

4. **Expo EAS Build — the best white-label story.** Build profiles with `app.config.js` dynamic configuration allow generating completely different apps from the same codebase by injecting school name, package name, icons, colors, and API endpoints. This is Vitana's key commercial differentiator.

5. **Navigation with Expo Router v4.** File-based routing (like Next.js) mirrors the web team's mental model. Deep linking is handled automatically. The router generates URL schemas compatible with notification deep-link targeting.

6. **Indian hiring market.** React Native engineers are 10× more available than Flutter engineers in India (Bangalore, Pune, Hyderabad, Delhi). Vitana can scale the team without a search-and-train bottleneck.

**Known tradeoffs and mitigations:**

| Tradeoff | Severity | Mitigation |
|---|---|---|
| Performance vs Flutter | Low | Hermes engine + React Native's New Architecture (JSI) closes the gap significantly for CRUD apps like Vitana |
| JavaScript single thread | Low | Worklets (Reanimated 3) for animations; logic-heavy operations move to native threads via JSI |
| Bundle size | Medium | Hermes bytecode compilation reduces JS parse time; code splitting via lazy loading |

---

### 3.2 Flutter — Why Rejected

Flutter is an excellent framework, but wrong for Vitana at this stage:

1. **Language switch cost.** The entire web team writes TypeScript. Moving to Dart requires retraining or new hires. A 6-month head start is given up for an animation quality improvement that school ERP apps don't need.

2. **No OTA update for UI.** Flutter compiles Dart to machine code. Any UI change requires a new store build. For a fast-moving SaaS product updating multiple school apps, this is operationally untenable. React Native's OTA is a core business advantage.

3. **No code sharing with web.** The `api/`, `hooks/`, and `types/` layers built for the web cannot be reused in Flutter. Engineering efficiency requires duplication.

4. **Smaller Indian hiring pool.** Flutter is growing but the React Native pool in India is still 3–5× larger. When scaling from 2 to 8 mobile engineers, Flutter creates a real bottleneck.

---

### 3.3 Kotlin Multiplatform — Why Rejected

KMP is not a complete mobile solution at this stage:

1. **Not a UI framework.** KMP shares business logic (ViewModels, repositories) but requires native UI in Compose (Android) and SwiftUI (iOS). This means two UI codebases, not one. For Vitana's 40+ screens, this doubles the work.

2. **Team has no Kotlin/Swift skills.** The investment required to upskill is 3–4× that of React Native.

3. **Immaturity.** KMP stabilized in 2024. The tooling, documentation, and community are still maturing compared to React Native or Flutter.

---

## 4. Expo SDK Decision

Using **Expo Managed Workflow with EAS** (not bare workflow). Rationale:

| Feature | Managed + EAS | Bare Workflow |
|---|---|---|
| Native module access | ✅ via EAS Build | ✅ via Xcode/Android Studio |
| OTA updates | ✅ EAS Update | ✅ EAS Update |
| Build infra | ✅ EAS Cloud (no Mac needed) | ✅ EAS Cloud |
| Custom native code | ✅ via Expo Modules API | ✅ Direct |
| Team overhead | Low (no Xcode/Gradle maintenance) | Medium |
| White label | ✅ `app.config.js` dynamic | ✅ More flexible but more work |

Managed workflow + EAS removes the need for macOS development machines for Android builds. iOS builds run on Expo's M-series Mac fleet. Team needs only one Mac for signing setup.

If a module requires custom native code not available in Expo's ecosystem, we can **eject to bare workflow** without rewriting the app. This is a safe escape hatch.

---

## 5. Complementary Technology Stack

| Category | Choice | Rationale |
|---|---|---|
| Navigation | Expo Router v4 | File-based routing, deep-link native, mirrors Next.js |
| Server state | TanStack Query v5 | Same as web; mutation, caching, optimistic updates |
| Local state | Zustand v5 | Lightweight, no boilerplate, devtools |
| Styling | NativeWind v4 (Tailwind → StyleSheet) | Shares Tailwind config with web |
| Component library | Gluestack UI v2 | Tailwind-compatible, accessible, React Native + Web |
| Icons | Expo Vector Icons (Lucide set) | Matches web's Lucide icons |
| Image handling | Expo Image (replaces Fast Image) | Caching, blur hash, progressive loading |
| Animations | Reanimated 3 + Moti | Worklet-based (off JS thread) |
| Gestures | React Native Gesture Handler | Required by Reanimated |
| Forms | React Hook Form + Zod | Same as web |
| Secure storage | Expo SecureStore | Keychain (iOS) / Keystore (Android) |
| SQLite (offline) | expo-sqlite v14 (Drizzle ORM) | Typed queries, migrations |
| Push notifications | Expo Notifications | FCM (Android) + APNS (iOS) unified |
| Deep linking | Expo Router (native) | Auto-generated from file structure |
| Payments | Cashfree React Native SDK | Existing Cashfree backend |
| PDF viewing | Expo WebBrowser / react-native-pdf | Open/view server-generated PDFs |
| File upload | Expo ImagePicker + DocumentPicker | Multipart upload to existing API |
| Analytics | Amplitude / Mixpanel RN SDK | Usage analytics |
| Crash reporting | Sentry React Native | Match backend's Sentry setup |
| Performance monitoring | Sentry Performance | APM for mobile |
| Testing | Jest + React Native Testing Library + Maestro (E2E) | CI-compatible |

---

## 6. New Architecture (JSI / Fabric / TurboModules)

React Native's **New Architecture** (enabled by default in SDK 52) provides:

- **JSI (JavaScript Interface):** Direct synchronous native calls without the async bridge. Critical for offline SQLite operations and biometric auth.
- **Fabric Renderer:** Synchronous rendering tree reconciliation. Reduces jank on list scrolling (student lists, attendance grids).
- **TurboModules:** Lazy-loaded native modules. Reduces startup time.
- **Concurrent React:** React 18+ concurrent features work natively.

All chosen libraries (Reanimated 3, Gesture Handler, Expo modules) support the New Architecture. No legacy modules will be added.

---

## 7. Minimum Supported Versions

| Platform | Minimum | Target | Rationale |
|---|---|---|---|
| Android | API 24 (Android 7.0) | API 28+ (Android 9+) | Covers 97%+ of Indian Android users |
| iOS | iOS 16.0 | iOS 17+ | Required by Expo SDK 52 |

**Bundle size target:** < 10 MB initial JS bundle (Hermes bytecode). Total app install size < 50 MB.

---

## 8. Language & Tooling

| Tool | Version | Purpose |
|---|---|---|
| TypeScript | 5.5 | Type safety |
| Expo SDK | 52 | Mobile platform |
| Node.js | 22 LTS | Build tool runtime |
| pnpm | 9 | Package manager (matches web workspace) |
| Bun | 1.1 | Fast test runner |
| ESLint | 9 + Expo plugin | Linting |
| Prettier | 3 | Formatting |
| Lefthook | latest | Pre-commit hooks |

---

*Next: [05-repository-strategy.md](./05-repository-strategy.md)*
