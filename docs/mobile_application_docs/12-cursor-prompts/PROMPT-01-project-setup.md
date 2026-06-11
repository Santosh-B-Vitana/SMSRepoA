# PROMPT-01: Mobile Project Setup & Foundation

> **Version**: 2.0 — Full 10-Phase Anatomy  
> **Epic**: EP-02 — Mobile Foundation & Architecture  
> **Sprint**: 1–2 (Weeks 1–4)  
> **Story Points**: 32  
> **Prerequisites**: None — this is the starting point  
> **Next Prompt**: PROMPT-02 (Authentication)  
> **Execution Time Estimate**: 2 engineers × 2 weeks

---

## PHASE 1: Context & Scope

> **ARCHITECTURE PRINCIPLE — ONE APP, MULTIPLE ROLES**
>
> Vitana SMS has **one mobile app** (`com.vitana.sms`). After login, the JWT role claim determines which portal the user sees:
> - `Parent` → Parent portal (tabs: Home, Attendance, Fees, Results, More)
> - `Teacher` / `Staff` → Teacher portal (tabs: Home, Classes, Marks, Timetable, More)
> - `Student` → Student portal (tabs: Home, Schedule, Results, Assignments, More)
> - `Admin` / `Principal` → Admin portal (tabs: Dashboard, Approvals, Announce, Reports, More)
> - `SuperAdmin` → Super-admin portal
>
> **There are NO separate parent app, teacher app, or student app binaries.** All roles share one binary. PROMPT-03, PROMPT-04, PROMPT-08, and PROMPT-09 each build the portal (a set of screens) for their role — they are features within this single app.
>
> **White-label:** A school that requests a dedicated app gets **ONE branded binary** (`com.<school>.sms`) that serves all its roles (parents, teachers, students, admin). Vitana does NOT create 3 separate white-label apps per school.

### What We're Building

We are building the **Vitana SMS Mobile Platform** — the mobile extension of an existing production-grade School ERP. This prompt creates the complete technical foundation that every subsequent feature depends on.

**This prompt delivers:**
- pnpm monorepo extended with `mobile/` workspace and `packages/shared-types`, `packages/shared-utils`
- Expo SDK 52 React Native app with Expo Router v4 file-based navigation
- API client with JWT auth, token refresh queue, and API envelope unwrapping
- Zustand stores persisted to Expo SecureStore (tokens) and AsyncStorage (branding)
- NativeWind v4 theming system that **exactly mirrors the web app's Tailwind tokens**
- Role-based navigation skeleton (5 role groups, placeholder screens) — all within one app binary
- Sentry crash reporting initialized
- Development environment verified working on physical device

### Current State

- ✅ Backend: ASP.NET Core 8, all APIs at `https://api.vitanasms.com/api`
- ✅ API standard envelope: every response is `{ success: bool, data: T, message: string, correlationId: string }`
- ✅ JWT claims: `userId` (Guid), `schoolId` (Guid), `role` (string), `linkedEntityId` (Guid), `email`
- ✅ Web frontend: React 19 + Vite 6 at `ui/` using Tailwind CSS + shadcn/ui
- ✅ Web design tokens: primary `#1a6fd8`, accent `#17a2b8`, navy `#0f1629`, font Inter+Poppins
- ✅ pnpm monorepo with `ui/` as workspace package
- ❌ No `mobile/` directory exists
- ❌ No shared TypeScript packages between web and mobile
- ❌ No React Native or Expo configuration
- ❌ No mobile CI/CD

### Success Criteria

- [ ] `pnpm install` from repo root resolves all workspace packages with zero errors
- [ ] `pnpm --filter @vitana/mobile start` starts Expo dev server
- [ ] App opens on physical Android device showing the auth screen
- [ ] App opens on iOS simulator showing the auth screen
- [ ] `pnpm --filter @vitana/mobile tsc --noEmit` reports 0 TypeScript errors
- [ ] `pnpm --filter @vitana/mobile lint` reports 0 ESLint errors
- [ ] API client injects `Authorization`, `X-Academic-Year`, `X-Correlation-ID` headers
- [ ] 401 response triggers token refresh (verified by manually expiring token)
- [ ] Tokens stored in Expo SecureStore (NOT AsyncStorage)
- [ ] Mobile UI uses identical color tokens to the web (`#1a6fd8` primary, `#17a2b8` accent)
- [ ] Cold start to auth screen < 1.5 seconds on mid-range Android device

### User Stories (Foundation)

- *As a mobile engineer, I want a pre-configured project skeleton so I can build any feature without infrastructure decisions.*
- *As a parent/teacher/student, I want the mobile app to feel like a native extension of the Vitana web experience — same colors, same fonts, same quality.*
- *As an operations engineer, I want crash reporting initialized so production issues are caught immediately.*

---

## PHASE 2: Analysis Phase

### Read These Architecture Documents First

Before writing a single line of code, read all of these:

```bash
# Read in this order — they build on each other
docs/mobile_application_docs/06-mobile-architecture.md    # Folder structure, state, networking
docs/mobile_application_docs/05-repository-strategy.md    # Monorepo design, shared packages
docs/mobile_application_docs/04-technology-recommendation.md # Why Expo SDK 52 + NativeWind
docs/mobile_application_docs/02-erp-analysis.md           # API patterns, multi-tenancy, auth
docs/mobile_application_docs/00-execution-order.md        # What this prompt enables
```

### Existing Code Audit

After reading the architecture docs, run ONLY these targeted checks:

```bash
# 1. Verify current pnpm-workspace.yaml
cat pnpm-workspace.yaml

# 2. Check existing web app design tokens (mobile must match these)
cat ui/tailwind.config.js
cat ui/src/App.css

# 3. Verify backend API base URL and confirm health endpoint
curl https://api.vitanasms.com/health/live

# 4. Check if any React Native packages accidentally installed in root
cat package.json | grep -E "react-native|expo"

# 5. Confirm Node.js version
node --version  # Must be >= 22 LTS

# 6. Confirm pnpm version
pnpm --version  # Must be >= 9
```

### Web Design Token Extraction

**CRITICAL**: The mobile app must look identical to the web app. Extract these tokens from the web codebase and replicate them exactly in mobile:

From `ui/tailwind.config.js` and `ui/src/App.css`, capture:

| Token | Web Value | Mobile NativeWind Value |
|---|---|---|
| Primary color | `hsl(217, 91%, 50%)` = `#1a6fd8` | `primary: '#1a6fd8'` |
| Accent color | `hsl(185, 85%, 45%)` = `#17a2b8` | `accent: '#17a2b8'` |
| Sidebar/nav bg | `hsl(222, 47%, 11%)` = `#0f1629` | `navy: '#0f1629'` |
| Background | `hsl(0, 0%, 100%)` = `#ffffff` | `background: '#ffffff'` |
| Surface (card bg) | `hsl(210, 40%, 97%)` = `#f5f7fa` | `surface: '#f5f7fa'` |
| Text primary | `hsl(222, 47%, 11%)` = `#1a1a2e` | `textPrimary: '#1a1a2e'` |
| Text secondary | `hsl(215, 16%, 47%)` = `#6b7280` | `textSecondary: '#6b7280'` |
| Border | `hsl(214, 32%, 91%)` = `#e2e8f0` | `border: '#e2e8f0'` |
| Success | `hsl(142, 76%, 36%)` = `#16a34a` | `success: '#16a34a'` |
| Warning | `hsl(38, 92%, 50%)` = `#f59e0b` | `warning: '#f59e0b'` |
| Danger | `hsl(0, 84%, 60%)` = `#ef4444` | `danger: '#ef4444'` |
| Border radius | `0.75rem` = `12px` | `rounded-xl` class = `12` |
| Font heading | Poppins | expo-google-fonts/poppins |
| Font body | Inter | expo-google-fonts/inter |

### Technology Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| **Framework** | Expo SDK 52, New Architecture (Fabric + JSI) | Managed workflow, no Xcode needed for builds |
| **Navigation** | Expo Router v4 (file-based) | Mirrors Next.js mental model, deep links auto-generated |
| **HTTP** | Axios 1.7 | Interceptor pattern, same as web `ui/` layer |
| **Server state** | TanStack Query v5 | Same as web; stale-while-revalidate, offline cache |
| **Local state** | Zustand v5 + persist | Minimal boilerplate, SecureStore adapter |
| **Styling** | NativeWind v4 | Share Tailwind config with web; class-based styling |
| **Secure storage** | expo-secure-store | iOS Keychain / Android Keystore. NEVER AsyncStorage for tokens |
| **Crash reporting** | @sentry/react-native | Matches backend Sentry; correlation IDs link errors |
| **Lists** | @shopify/flash-list | 10× faster than FlatList; required for attendance grids |
| **Images** | expo-image | Built-in caching, blurhash, progressive loading |
| **Fonts** | @expo-google-fonts/inter + @expo-google-fonts/poppins | Exact fonts used in web |

---

## PHASE 3: Technical Planning

### 3.1 Monorepo Architecture

```
SMSRepoA/
├── mobile/                    ← NEW: React Native workspace package
│   ├── app/                   ← Expo Router screens (file = route)
│   ├── src/                   ← All non-screen code
│   ├── assets/                ← Images, fonts, icons
│   ├── app.config.js          ← Dynamic Expo config
│   ├── eas.json               ← EAS build profiles
│   ├── tailwind.config.js     ← NativeWind config (imports design tokens)
│   └── package.json           ← @vitana/mobile
│
├── packages/                  ← NEW: Shared workspace packages
│   ├── shared-types/          ← @vitana/shared-types (TypeScript interfaces)
│   └── shared-utils/          ← @vitana/shared-utils (pure utility functions)
│
├── ui/                        ← EXISTING: React web app (unchanged)
└── pnpm-workspace.yaml        ← UPDATED: includes mobile + packages/*
```

### 3.2 Navigation Architecture

Expo Router maps the `app/` file tree to URL routes. Route groups `(auth)`, `(parent)`, `(teacher)`, `(student)`, `(admin)`, `(super-admin)` are invisible in URLs (presentational only).

```
app/
├── _layout.tsx          ← Root: Providers + auth guard + role routing
├── +not-found.tsx       ← 404 screen
├── maintenance.tsx      ← Maintenance mode (full-screen, undismissable)
├── force-update.tsx     ← Force update (full-screen, undismissable)
│
├── (auth)/
│   ├── _layout.tsx      ← Stack navigator, no tab bar
│   ├── index.tsx        ← School domain entry (shared app) / auto-skip (white-label)
│   └── login.tsx        ← Login form
│
├── (parent)/
│   ├── _layout.tsx      ← Tabs: Home | Attendance | Fees | Results | More
│   └── index.tsx        ← Placeholder
│
├── (teacher)/
│   ├── _layout.tsx      ← Tabs: Home | Classes | Marks | Schedule | More
│   └── index.tsx        ← Placeholder
│
├── (student)/
│   ├── _layout.tsx      ← Tabs: Home | Schedule | Results | Assignments | More
│   └── index.tsx        ← Placeholder
│
├── (admin)/
│   ├── _layout.tsx      ← Tabs: Dashboard | Approvals | Post | Reports | More
│   └── index.tsx        ← Placeholder
│
└── (super-admin)/
    ├── _layout.tsx      ← Stack navigator
    └── index.tsx        ← Placeholder
```

**Role routing logic** in `app/_layout.tsx`:

| JWT Role | Redirects To |
|---|---|
| `Parent` | `/(parent)` |
| `Student` | `/(student)` |
| `Teacher`, `Staff`, `Librarian`, `TransportManager`, `HostelWarden`, `Receptionist` | `/(teacher)` |
| `Admin`, `Principal`, `HRManager`, `Accountant` | `/(admin)` |
| `SuperAdmin` | `/(super-admin)` |
| Not authenticated | `/(auth)` |

### 3.3 API Client Architecture

```
Request Pipeline:
  App code
    → apiClient.get('/endpoint')
    → Request Interceptor 1: inject Authorization: Bearer <token>
    → Request Interceptor 2: inject X-Academic-Year: <year>
    → Request Interceptor 3: inject X-Correlation-ID: <uuid>
    → HTTP
    → Backend (returns { success, data, message })
    → Response Interceptor 1: unwrap response.data.data
    → App code receives unwrapped data directly

401 Path:
  Backend returns 401
    → Response Interceptor 2: detect 401
    → Is refresh already in progress?
        → Yes: queue this request, await refresh completion
        → No: set isRefreshing=true, call /api/auth/refresh
            → Refresh success: update tokens, retry all queued requests
            → Refresh failure: clearAuth(), router.replace('/(auth)/login')
```

### 3.4 State Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     UI / Screens                        │
├──────────────┬──────────────┬───────────────────────────┤
│  TanStack    │   Zustand    │     React Local State     │
│  Query       │   Stores     │     (forms, modals)       │
│  (API data)  │  (session)   │                           │
├──────────────┼──────────────┼───────────────────────────┤
│  In-memory + │ SecureStore  │         Memory            │
│  AsyncStorage│ AsyncStorage │                           │
└──────────────┴──────────────┴───────────────────────────┘
```

| Data Category | Storage | TTL |
|---|---|---|
| Access token | Zustand → SecureStore | 60 min (JWT) |
| Refresh token | Zustand → SecureStore | 30 days |
| User profile | Zustand → SecureStore | Session |
| School branding | Zustand → AsyncStorage | 24 hours |
| Feature flags | TanStack Query → AsyncStorage | 30 minutes |
| API list data | TanStack Query (in-memory) | 5–30 minutes |
| Form state | React local state | Ephemeral |

---

## PHASE 4: Database Design

> **This prompt has no database changes.**  
> The Vitana SMS backend database is managed by the .NET backend team.  
> Mobile is a pure API consumer. No migrations required for this foundation prompt.

However, the mobile app **does** use SQLite locally (via expo-sqlite v14 + Drizzle ORM). The schema for offline storage is introduced in PROMPT-04 (Teacher Portal offline attendance). For now, simply install the SQLite packages so they're available.

```bash
# Install SQLite packages (schema defined in PROMPT-04)
pnpm --filter @vitana/mobile add expo-sqlite drizzle-orm
pnpm --filter @vitana/mobile add -D drizzle-kit
```

---

## PHASE 5: Backend Implementation

> **No backend implementation in this prompt.**  
> The only backend change required for Phase 1 of the mobile platform is `GET /api/mobile/app-config` — this is specified in PROMPT-11 (Mobile API Gaps) which the backend engineer executes in parallel during Sprint 2.

**Mobile engineers:** Build against this mock until H-1 handoff (end of Sprint 2):

```typescript
// src/__mocks__/appConfig.ts
export const MOCK_APP_CONFIG = {
  schoolId: 'mock-school-id',
  academicYear: '2025-2026',
  branding: {
    schoolName: 'Vitana Demo School',
    logoUrl: null,
    primaryColor: '#1a6fd8',
    accentColor: '#17a2b8',
  },
  modules: {
    library: true, transport: false, hostel: false, onlineExams: false, whatsapp: false,
  },
  mobileFeatures: {
    'mobile.attendance.offline': true,
    'mobile.fees.online_payment': true,
    'mobile.parent.multi_child': true,
  },
  rolePermissions: { canMarkAttendance: true, canEnterMarks: true, canViewFinance: false },
  remoteConfig: {
    supportEmail: 'support@vitanasms.com',
    maxOfflineQueueSize: 200,
    syncIntervalMinutes: 5,
    attendanceGracePeriodMinutes: 15,
  },
  versionRequirements: {
    minVersion: '1.0.0',
    recommendedVersion: '1.0.0',
    forceUpdateVersion: null,
    maintenanceMode: false,
    maintenanceMessage: null,
    androidStoreUrl: 'https://play.google.com/store',
    iosStoreUrl: 'https://apps.apple.com',
  },
};
```

---

## PHASE 6: Mobile Implementation

### 6.1 Prerequisites — Install on Your Machine

Before running any command, ensure these are installed:

```bash
# 1. Node.js 22 LTS
node --version  # Should output v22.x.x
# If not: brew install node@22 (macOS) or nvm use 22

# 2. pnpm 9
npm install -g pnpm@9
pnpm --version  # Should output 9.x.x

# 3. Expo CLI + EAS CLI
npm install -g @expo/eas-cli expo-cli

# 4. iOS development (macOS only)
# Install Xcode from App Store, then:
sudo xcode-select --install
# Open Xcode and accept license agreements

# 5. Android development
# Install Android Studio from https://developer.android.com/studio
# In SDK Manager, install: API 34, Android SDK Build-Tools, Emulator
# Add to ~/.zshrc or ~/.bash_profile:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# 6. Java 17 (required for Android builds)
brew install --cask temurin@17

# 7. Watchman (required for Metro bundler on macOS)
brew install watchman

# Verify all tools
expo --version
eas --version
adb --version  # Android debug bridge
```

### 6.2 Step 1 — Update pnpm Workspace

```yaml
# pnpm-workspace.yaml (replace entire file)
packages:
  - 'ui'
  - 'mobile'
  - 'packages/*'
```

### 6.3 Step 2 — Create Shared Types Package

```bash
mkdir -p packages/shared-types/src/api
mkdir -p packages/shared-types/src/models
```

```json
// packages/shared-types/package.json
{
  "name": "@vitana/shared-types",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

```json
// packages/shared-types/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

```typescript
// packages/shared-types/src/api/auth.ts
export type UserRole =
  | 'SuperAdmin' | 'Admin' | 'Principal' | 'Teacher' | 'Staff'
  | 'HRManager' | 'Accountant' | 'Librarian' | 'TransportManager'
  | 'HostelWarden' | 'Receptionist' | 'Parent' | 'Student';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  schoolId: string;
  fullName: string;
  linkedEntityId: string;  // Guardian ID (Parent) | Student ID (Student) | Staff ID (Teacher/Staff)
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiration: string; // ISO 8601
  user: UserProfile;
  requiresTwoFactor?: boolean;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiration: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  correlationId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

```typescript
// packages/shared-types/src/api/mobile.ts
export interface SchoolBranding {
  schoolName: string;
  logoUrl: string | null;
  primaryColor: string;   // hex: '#1a6fd8'
  accentColor: string;    // hex: '#17a2b8'
  splashScreenUrl?: string | null;
  appIconUrl?: string | null;
  fonts?: { heading: string; body: string } | null;
}

export interface ModuleFlags {
  library: boolean;
  transport: boolean;
  hostel: boolean;
  onlineExams: boolean;
  whatsapp: boolean;
  alumni: boolean;
  healthRecords: boolean;
}

export interface MobileFeatureFlags {
  [key: string]: boolean;
  'mobile.attendance.offline': boolean;
  'mobile.attendance.biometric': boolean;
  'mobile.fees.online_payment': boolean;
  'mobile.fees.wallet': boolean;
  'mobile.parent.multi_child': boolean;
  'mobile.exams.online_exam_portal': boolean;
}

export interface RolePermissions {
  canMarkAttendance: boolean;
  canEnterMarks: boolean;
  canViewFinance: boolean;
  canApproveLeave: boolean;
  canCreateAnnouncement: boolean;
}

export interface RemoteConfig {
  attendanceGracePeriodMinutes: number;
  maxOfflineQueueSize: number;
  syncIntervalMinutes: number;
  supportEmail: string;
  feedbackFormUrl?: string;
  featureAnnouncements: FeatureAnnouncement[];
}

export interface FeatureAnnouncement {
  id: string;
  title: string;
  message: string;
  linkUrl?: string;
  expiresAt?: string;
}

export interface VersionRequirements {
  minVersion: string;
  recommendedVersion: string;
  forceUpdateVersion: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  androidStoreUrl: string;
  iosStoreUrl: string;
}

export interface AppConfig {
  schoolId: string;
  academicYear: string;
  branding: SchoolBranding;
  modules: ModuleFlags;
  mobileFeatures: MobileFeatureFlags;
  rolePermissions: RolePermissions;
  remoteConfig: RemoteConfig;
  versionRequirements: VersionRequirements;
}
```

```typescript
// packages/shared-types/src/api/attendance.ts
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'HalfDay';

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string | null;
  rollNumber: string;
  date: string;         // ISO 8601 date string 'YYYY-MM-DD'
  status: AttendanceStatus;
  markedBy: string;
  remarks?: string | null;
}

export interface ClassAttendanceSummary {
  classId: string;
  className: string;
  date: string;
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  attendancePercent: number;
  isMarked: boolean;
}

export interface MonthlyAttendance {
  month: number;  // 1–12
  year: number;
  records: DayAttendance[];
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkingDays: number;
  attendancePercent: number;
}

export interface DayAttendance {
  date: string;    // 'YYYY-MM-DD'
  status: AttendanceStatus | 'Holiday' | 'Weekend' | 'Future';
}
```

```typescript
// packages/shared-types/src/api/fees.ts
export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  lateFeeAmount: number;
  dueDate: string;
  lastPaymentDate: string | null;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  feeHeads: FeeHeadRecord[];
}

export interface FeeHeadRecord {
  feeHeadId: string;
  feeHeadName: string;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  isConcession: boolean;
  concessionType?: string | null;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMode: 'Cash' | 'Cheque' | 'Online' | 'UPI' | 'Card';
  receiptNumber: string;
  receiptUrl: string | null;
  transactionId?: string | null;
  status: 'Success' | 'Failed' | 'Pending';
}

export interface MobilePaymentInitResponse {
  cfOrderId: string;
  paymentSessionId: string;
  amount: number;
  currency: 'INR';
  expiresAt: string;
}
```

```typescript
// packages/shared-types/src/api/examinations.ts
export interface ExamResult {
  id: string;
  examId: string;
  examName: string;
  examType: string;
  date: string;
  studentId: string;
  classId: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  grade: string;
  rank: number | null;
  isPublished: boolean;
  subjectResults: SubjectResult[];
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  theoryMaxMarks: number;
  theoryMarks: number | null;
  practicalMaxMarks: number | null;
  practicalMarks: number | null;
  totalMarks: number;
  marksObtained: number;
  grade: string;
  isPassed: boolean;
  isAbsent: boolean;
}

export interface ReportCard {
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  overallGrade: string;
  overallPercentage: number;
  attendancePercent: number;
  pdfUrl: string;
  generatedAt: string;
}
```

```typescript
// packages/shared-types/src/api/announcements.ts
export type AnnouncementPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type AnnouncementAudience = 'All' | 'Parents' | 'Staff' | 'Students' | 'Class';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  classIds: string[] | null;
  isRead: boolean;
  publishedAt: string;
  expiresAt: string | null;
  authorName: string;
}
```

```typescript
// packages/shared-types/src/api/notifications.ts
export type NotificationType =
  | 'fee_due' | 'fee_overdue' | 'fee_payment_confirmed'
  | 'attendance_absent' | 'attendance_shortage'
  | 'result_published' | 'report_card_ready'
  | 'new_announcement' | 'new_diary_entry'
  | 'leave_approved' | 'leave_rejected' | 'leave_request_received'
  | 'new_message' | 'timetable_change'
  | 'assignment_created' | 'assignment_graded' | 'submission_received'
  | 'billing_expiry_warning' | 'billing_expired';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  deepLinkUrl?: string | null;
  data?: Record<string, string> | null;
}
```

```typescript
// packages/shared-types/src/index.ts
export * from './api/auth';
export * from './api/mobile';
export * from './api/attendance';
export * from './api/fees';
export * from './api/examinations';
export * from './api/announcements';
export * from './api/notifications';
```

### 6.4 Step 3 — Create Shared Utils Package

```json
// packages/shared-utils/package.json
{
  "name": "@vitana/shared-utils",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.2.0"
  }
}
```

```typescript
// packages/shared-utils/src/formatters.ts

const IST_TIMEZONE = 'Asia/Kolkata';

/** Format a number as Indian Rupees: ₹1,23,456.00 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format ISO 8601 date string in IST timezone */
export function formatDateIST(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: IST_TIMEZONE,
  });
}

/** Format ISO 8601 datetime with time in IST */
export function formatDateTimeIST(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: IST_TIMEZONE,
  });
}

/** Relative time: "2 hours ago", "Yesterday", "Jun 10" */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDateIST(iso);
}

/** Format attendance as percentage string: "94.2%" */
export function formatAttendancePercent(present: number, total: number): string {
  if (total === 0) return '0%';
  return `${((present / total) * 100).toFixed(1)}%`;
}

/** Return color category based on attendance percentage */
export function getAttendanceColor(percent: number): 'success' | 'warning' | 'danger' {
  if (percent >= 85) return 'success';
  if (percent >= 75) return 'warning';
  return 'danger';
}

/** Mask Aadhaar: "123456789012" → "XXXX-XXXX-9012" */
export function maskAadhaar(aadhaar: string): string {
  const clean = aadhaar.replace(/\D/g, '');
  if (clean.length !== 12) return aadhaar;
  return `XXXX-XXXX-${clean.slice(8)}`;
}

/** Mask PAN: "ABCDE1234F" → "ABCXX-1234-X" */
export function maskPAN(pan: string): string {
  if (pan.length !== 10) return pan;
  return `${pan.slice(0, 3)}XX-${pan.slice(5, 9)}-${pan.slice(9)}`;
}

/** Format academic year: "2025-2026" → "AY 2025–26" */
export function formatAcademicYear(year: string): string {
  return `AY ${year.replace('-', '–').slice(0, -2)}`;
}

/** Get fee amount bucket for analytics (never log raw amounts) */
export function getAmountBucket(amount: number): '<5k' | '5k-20k' | '20k-50k' | '>50k' {
  if (amount < 5000) return '<5k';
  if (amount < 20000) return '5k-20k';
  if (amount < 50000) return '20k-50k';
  return '>50k';
}

/** Generate a UUID v4 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Compare semver strings: semverLt('1.1.0', '1.2.0') → true */
export function semverLt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return false;
  }
  return false;
}
```

```typescript
// packages/shared-utils/src/validators.ts
export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidAadhaar(aadhaar: string): boolean {
  return /^\d{12}$/.test(aadhaar.replace(/\D/g, ''));
}

export function isValidPAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
}

export function isValidIFSC(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
}
```

```typescript
// packages/shared-utils/src/constants.ts
export const IST_TIMEZONE = 'Asia/Kolkata';

export const ACADEMIC_YEAR_HEADER = 'X-Academic-Year';
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

export const USER_ROLES = [
  'SuperAdmin', 'Admin', 'Principal', 'Teacher', 'Staff',
  'HRManager', 'Accountant', 'Librarian', 'TransportManager',
  'HostelWarden', 'Receptionist', 'Parent', 'Student',
] as const;

export const STAFF_ROLES = [
  'Admin', 'Principal', 'Teacher', 'Staff',
  'HRManager', 'Accountant', 'Librarian', 'TransportManager',
  'HostelWarden', 'Receptionist',
] as const;

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'HalfDay'] as const;

export const ATTENDANCE_THRESHOLD_PERCENT = 75; // Default shortage threshold

export const VITANA_DESIGN_TOKENS = {
  colors: {
    primary: '#1a6fd8',
    accent: '#17a2b8',
    navy: '#0f1629',
    background: '#ffffff',
    surface: '#f5f7fa',
    textPrimary: '#1a1a2e',
    textSecondary: '#6b7280',
    border: '#e2e8f0',
    success: '#16a34a',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  borderRadius: 12,
  fonts: {
    heading: 'Poppins',
    body: 'Inter',
  },
} as const;
```

```typescript
// packages/shared-utils/src/index.ts
export * from './formatters';
export * from './validators';
export * from './constants';
```

### 6.5 Step 4 — Initialize Expo Mobile App

```bash
# From the repo root
cd /path/to/SMSRepoA

# Create the mobile app using Expo's template
npx create-expo-app mobile --template blank-typescript

# Then remove default content and install correct dependencies
cd mobile
```

Now replace `mobile/package.json` with:

```json
{
  "name": "@vitana/mobile",
  "version": "1.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "start:clear": "expo start --clear",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android --profile production",
    "build:ios": "eas build --platform ios --profile production",
    "build:preview": "eas build --platform all --profile preview",
    "update:production": "eas update --channel production",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test": "jest --watchAll=false",
    "test:watch": "jest"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "18.3.2",
    "react-native": "0.76.0",
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "axios": "^1.7.0",
    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.17",
    "expo-secure-store": "~14.0.0",
    "expo-local-authentication": "~15.0.0",
    "expo-image": "~2.0.0",
    "expo-file-system": "~18.0.0",
    "expo-web-browser": "~14.0.0",
    "expo-sqlite": "~15.0.0",
    "expo-notifications": "~0.29.0",
    "expo-application": "~6.0.0",
    "expo-screen-capture": "~6.0.0",
    "expo-document-picker": "~13.0.0",
    "expo-image-picker": "~16.0.0",
    "expo-haptics": "~14.0.0",
    "expo-linking": "~7.0.0",
    "expo-constants": "~17.0.0",
    "@expo-google-fonts/inter": "^0.2.3",
    "@expo-google-fonts/poppins": "^0.2.3",
    "@shopify/flash-list": "^1.7.1",
    "react-hook-form": "^7.54.2",
    "zod": "^3.23.8",
    "@hookform/resolvers": "^3.9.0",
    "@react-native-community/netinfo": "^11.4.1",
    "drizzle-orm": "^0.38.0",
    "@sentry/react-native": "~6.3.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "@vitana/shared-types": "workspace:*",
    "@vitana/shared-utils": "workspace:*"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.12",
    "@types/react-native": "~0.76.0",
    "typescript": "^5.5.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "jest-expo": "~52.0.0",
    "@testing-library/react-native": "^12.9.0",
    "eslint": "^9.0.0",
    "eslint-config-expo": "~8.0.0",
    "drizzle-kit": "^0.29.0"
  }
}
```

### 6.6 Step 5 — Configure Expo Router (app.config.js)

```javascript
// mobile/app.config.js
const schoolConfigs = (() => {
  try { return require('./scripts/school-configs.json'); } catch { return {}; }
})();

module.exports = ({ config }) => {
  const schoolId = process.env.SCHOOL_ID || 'vitana';
  const school = schoolConfigs[schoolId] || {
    schoolId: 'vitana',
    appName: 'Vitana SMS',
    slug: 'vitana-sms',
    androidPackage: 'com.vitana.sms',
    iosBundleId: 'com.vitana.sms',
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
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    splash: {
      image: `${assetBase}/splash-screen.png`,
      backgroundColor: school.colors.primary,
      resizeMode: 'contain',
    },

    icon: `${assetBase}/app-icon-1024.png`,

    android: {
      package: school.androidPackage,
      versionCode: parseInt(process.env.BUILD_NUMBER || '1'),
      adaptiveIcon: {
        foregroundImage: `${assetBase}/adaptive-icon.png`,
        backgroundColor: school.colors.primary,
      },
      permissions: [
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
      ],
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
    },

    ios: {
      bundleIdentifier: school.iosBundleId,
      buildNumber: process.env.BUILD_NUMBER || '1',
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: 'Camera is used to upload profile photos and document photos.',
        NSPhotoLibraryUsageDescription: 'Photo library access is used to upload student/staff photos.',
        NSFaceIDUsageDescription: 'Face ID is used to unlock the app securely.',
        NSLocalNetworkUsageDescription: 'Local network access is used for LAN development server.',
      },
    },

    plugins: [
      'expo-router',
      'expo-secure-store',
      ['expo-local-authentication', {
        faceIDPermission: 'Vitana SMS uses Face ID to securely unlock the app.',
      }],
      ['expo-notifications', {
        icon: `${assetBase}/notification-icon.png`,
        color: school.colors.primary,
      }],
      'expo-sqlite',
    ],

    extra: {
      schoolId,
      isWhiteLabel: school.isWhiteLabel || false,
      schoolDomain: school.schoolDomain || null,
      buildTimePrimaryColor: school.colors.primary,
      eas: {
        projectId: school.easProjectId || process.env.EAS_PROJECT_ID,
      },
    },

    updates: {
      url: `https://u.expo.dev/${school.easProjectId || process.env.EAS_PROJECT_ID}`,
      enabled: true,
      fallbackToCacheTimeout: 0,
    },

    experiments: {
      typedRoutes: true,
    },
  };
};
```

### 6.7 Step 6 — NativeWind Configuration (Design Parity with Web)

```javascript
// mobile/tailwind.config.js
// IMPORTANT: Colors MUST match the web app's tailwind.config.js exactly
const { VITANA_DESIGN_TOKENS } = require('../packages/shared-utils/dist/constants');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Exact mirror of web Tailwind config
        primary: {
          DEFAULT: '#1a6fd8',
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#1a6fd8',   // PRIMARY
          600: '#1558b0',
          700: '#1045a0',
          800: '#0d3680',
          900: '#0a2a70',
        },
        accent: {
          DEFAULT: '#17a2b8',
          500: '#17a2b8',
          600: '#138496',
        },
        navy: {
          DEFAULT: '#0f1629',
          900: '#0f1629',   // Sidebar background
          800: '#1a2540',
          700: '#253550',
        },
        surface:       '#f5f7fa',
        'text-primary':   '#1a1a2e',
        'text-secondary': '#6b7280',
        border:        '#e2e8f0',
        // Semantic
        success: { DEFAULT: '#16a34a', light: '#dcfce7' },
        warning: { DEFAULT: '#f59e0b', light: '#fef3c7' },
        danger:  { DEFAULT: '#ef4444', light: '#fee2e2' },
        info:    { DEFAULT: '#3b82f6', light: '#dbeafe' },
      },
      fontFamily: {
        heading: ['Poppins_600SemiBold'],
        'heading-bold': ['Poppins_700Bold'],
        body: ['Inter_400Regular'],
        'body-medium': ['Inter_500Medium'],
        'body-semibold': ['Inter_600SemiBold'],
        'body-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        DEFAULT: '12px',  // Matches web 0.75rem
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      spacing: {
        // Match web spacing scale exactly (4px base unit)
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
    },
  },
  plugins: [],
};
```

```javascript
// mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

```css
/* mobile/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```javascript
// mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
```

```json
// mobile/tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@vitana/shared-types": ["../packages/shared-types/src"],
      "@vitana/shared-utils": ["../packages/shared-utils/src"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

### 6.8 Step 7 — API Client (Full Implementation)

```typescript
// mobile/src/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { generateUUID } from '@vitana/shared-utils';
import { ApiResponse } from '@vitana/shared-types';
import { router } from 'expo-router';

// These imports are lazy to avoid circular dependency
let useAuthStore: typeof import('../stores/authStore').useAuthStore;
let useAcademicYearStore: typeof import('../stores/schoolStore').useSchoolStore;

// Lazy loader to prevent circular imports
async function loadStores() {
  if (!useAuthStore) {
    const authModule = await import('../stores/authStore');
    useAuthStore = authModule.useAuthStore;
  }
  if (!useAcademicYearStore) {
    const schoolModule = await import('../stores/schoolStore');
    useAcademicYearStore = schoolModule.useSchoolStore;
  }
}

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.vitanasms.com/api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await loadStores();

  // 1. Auth header
  const authState = useAuthStore?.getState();
  if (authState?.accessToken) {
    config.headers.Authorization = `Bearer ${authState.accessToken}`;
  }

  // 2. Academic year header
  const schoolState = useAcademicYearStore?.getState();
  if (schoolState?.academicYear) {
    config.headers['X-Academic-Year'] = schoolState.academicYear;
  }

  // 3. Correlation ID for end-to-end tracing
  config.headers['X-Correlation-ID'] = generateUUID();

  return config;
});

// ── Response Interceptor ─────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  // ✅ Success: unwrap { success: true, data: T } envelope
  (response) => {
    const envelope = response.data as ApiResponse<unknown>;
    if (envelope && 'data' in envelope) {
      return envelope.data as any;
    }
    return response.data;
  },

  // ❌ Error handler
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request; retry when refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      await loadStores();
      const { refreshToken, updateTokens, clearAuth } = useAuthStore.getState();

      if (!refreshToken) {
        clearAuth();
        router.replace('/(auth)/login');
        return Promise.reject(error);
      }

      try {
        const result = await apiClient.post('/auth/refresh', {
          accessToken: originalRequest.headers.Authorization?.toString().replace('Bearer ', ''),
          refreshToken,
        }) as any;

        const newAccessToken = result.token;
        const newRefreshToken = result.refreshToken;

        updateTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        clearAuth();
        router.replace('/(auth)/login');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Normalize error
    const apiError = new ApiError(
      (error.response?.data as any)?.message || error.message || 'An error occurred',
      error.response?.status ?? 0,
      (error.response?.headers as any)?.['x-correlation-id'],
    );

    return Promise.reject(apiError);
  },
);

export class ApiError extends Error {
  status: number;
  correlationId?: string;

  constructor(message: string, status: number, correlationId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.correlationId = correlationId;
  }
}

export default apiClient;
```

### 6.9 Step 8 — TanStack Query Client

```typescript
// mobile/src/api/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,         // 5 minutes before refetch
      gcTime: 30 * 60 * 1000,            // 30 minutes in memory
      retry: (count, error) => {
        if (error instanceof ApiError) {
          if ([401, 403, 404, 422].includes(error.status)) return false;
        }
        return count < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      placeholderData: (prev: unknown) => prev, // stale-while-revalidate
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### 6.10 Step 9 — Auth Store (Zustand + SecureStore)

```typescript
// mobile/src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '@vitana/shared-types';

// Expo SecureStore adapter for Zustand persist
const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // SecureStore unavailable (rare — emulators without secure hardware)
      // In this case, fall back silently
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      // ignore
    }
  },
};

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  // Actions
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      updateTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'vitana-auth',
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
```

### 6.11 Step 10 — School Store

```typescript
// mobile/src/stores/schoolStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppConfig, SchoolBranding, ModuleFlags, MobileFeatureFlags } from '@vitana/shared-types';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';

interface SchoolState {
  branding: SchoolBranding;
  moduleFlags: ModuleFlags;
  mobileFeatureFlags: MobileFeatureFlags;
  academicYear: string | null;
  schoolId: string | null;
  isConfigLoaded: boolean;
  // Actions
  setAppConfig: (config: AppConfig) => void;
  resetBranding: () => void;
  setAcademicYear: (year: string) => void;
}

const DEFAULT_BRANDING: SchoolBranding = {
  schoolName: 'Vitana SMS',
  logoUrl: null,
  primaryColor: VITANA_DESIGN_TOKENS.colors.primary,
  accentColor: VITANA_DESIGN_TOKENS.colors.accent,
};

const DEFAULT_MODULES: ModuleFlags = {
  library: false, transport: false, hostel: false,
  onlineExams: false, whatsapp: false, alumni: false, healthRecords: false,
};

const DEFAULT_MOBILE_FEATURES: MobileFeatureFlags = {
  'mobile.attendance.offline': true,
  'mobile.attendance.biometric': false,
  'mobile.fees.online_payment': false,
  'mobile.fees.wallet': false,
  'mobile.parent.multi_child': true,
  'mobile.exams.online_exam_portal': false,
};

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set) => ({
      branding: DEFAULT_BRANDING,
      moduleFlags: DEFAULT_MODULES,
      mobileFeatureFlags: DEFAULT_MOBILE_FEATURES,
      academicYear: null,
      schoolId: null,
      isConfigLoaded: false,

      setAppConfig: (config: AppConfig) =>
        set({
          branding: config.branding,
          moduleFlags: config.modules,
          mobileFeatureFlags: config.mobileFeatures,
          academicYear: config.academicYear,
          schoolId: config.schoolId,
          isConfigLoaded: true,
        }),

      resetBranding: () =>
        set({
          branding: DEFAULT_BRANDING,
          moduleFlags: DEFAULT_MODULES,
          mobileFeatureFlags: DEFAULT_MOBILE_FEATURES,
          isConfigLoaded: false,
        }),

      setAcademicYear: (year) => set({ academicYear: year }),
    }),
    {
      name: 'vitana-school',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

### 6.12 Step 11 — Root Layout (The Most Important File)

```typescript
// mobile/app/_layout.tsx
import '../global.css';
import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SentryRN from '@sentry/react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/stores/authStore';
import { queryClient } from '../src/api/queryClient';
import type { UserRole } from '@vitana/shared-types';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

// Initialize Sentry
SentryRN.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
  tracesSampleRate: process.env.EXPO_PUBLIC_ENV === 'production' ? 0.15 : 1.0,
  beforeSend: (event) => {
    // Scrub Authorization header — NEVER log tokens
    if (event.request?.headers?.Authorization) {
      event.request.headers.Authorization = '[Filtered]';
    }
    return event;
  },
});

function RoleRouter() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMaintenance = segments[0] === 'maintenance';
    const inForceUpdate = segments[0] === 'force-update';

    if (inMaintenance || inForceUpdate) return;

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Authenticated — route to correct role group
    if (inAuthGroup || segments.length === 0) {
      const route = getRoleRoute(user?.role);
      router.replace(route);
    }
  }, [isAuthenticated, isHydrated, segments, user?.role]);

  return null;
}

function getRoleRoute(role?: UserRole): string {
  switch (role) {
    case 'Parent':
      return '/(parent)';
    case 'Student':
      return '/(student)';
    case 'SuperAdmin':
      return '/(super-admin)';
    case 'Admin':
    case 'Principal':
    case 'HRManager':
    case 'Accountant':
      return '/(admin)';
    default:
      // Teacher, Staff, Librarian, TransportManager, HostelWarden, Receptionist
      return '/(teacher)';
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Still loading fonts
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RoleRouter />
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(parent)" />
          <Stack.Screen name="(teacher)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(super-admin)" />
          <Stack.Screen name="maintenance" />
          <Stack.Screen name="force-update" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
```

### 6.13 Step 12 — Placeholder Role Screens

Create identical placeholder for each role. Example for parent (repeat for all):

```typescript
// mobile/app/(parent)/_layout.tsx
import { Tabs } from 'expo-router';
import { useSchoolStore } from '../../src/stores/schoolStore';
import { VITANA_DESIGN_TOKENS } from '@vitana/shared-utils';
// Icons will use @expo/vector-icons Feather set
import { Feather } from '@expo/vector-icons';

export default function ParentLayout() {
  const { branding } = useSchoolStore();
  const primaryColor = branding?.primaryColor ?? VITANA_DESIGN_TOKENS.colors.primary;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: VITANA_DESIGN_TOKENS.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: VITANA_DESIGN_TOKENS.colors.background,
          borderTopColor: VITANA_DESIGN_TOKENS.colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Fees',
          tabBarIcon: ({ color, size }) => <Feather name="credit-card" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: 'Results',
          tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Feather name="menu" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

```typescript
// mobile/app/(parent)/index.tsx (and similar for all other roles)
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';

export default function ParentDashboard() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-6">
        <Text className="font-heading text-2xl text-text-primary mb-2">
          Parent Dashboard
        </Text>
        <Text className="font-body text-text-secondary text-center">
          Welcome, {user?.fullName}
        </Text>
        <Text className="font-body text-sm text-text-secondary mt-4 text-center opacity-60">
          [PROMPT-03 implements this screen]
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

### 6.14 Step 13 — Environment Variables

```bash
# mobile/.env.local (local development — gitignored)
EXPO_PUBLIC_API_BASE_URL=https://api.vitanasms.com/api
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_AMPLITUDE_API_KEY=
```

```bash
# mobile/.env.example (committed to git)
EXPO_PUBLIC_API_BASE_URL=https://api.vitanasms.com/api
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_key_here
EAS_PROJECT_ID=your_eas_project_id_here
SCHOOL_ID=vitana
```

```gitignore
# Add to mobile/.gitignore
.env.local
.env.production
google-services.json
GoogleService-Info.plist
assets/school-assets/*/
!assets/school-assets/vitana/
```

### 6.15 Step 14 — Create Default Vitana Assets

```bash
# Create default assets directory
mkdir -p mobile/assets/school-assets/vitana
mkdir -p mobile/assets/fonts

# IMPORTANT: Place these files manually or generate from the Vitana logo:
# mobile/assets/school-assets/vitana/app-icon-1024.png  (1024×1024 PNG)
# mobile/assets/school-assets/vitana/adaptive-icon.png  (1024×1024 PNG, Android)
# mobile/assets/school-assets/vitana/splash-screen.png  (2048×2048 PNG)
# mobile/assets/school-assets/vitana/notification-icon.png (96×96 white silhouette)

# Use the existing Vitana logo from the web app as source:
# ui/public/vitana-logo.jpg  → convert to PNG and resize using ImageMagick or Sharp:
# convert ui/public/vitana-logo.jpg -resize 1024x1024 -gravity center -background '#1a6fd8' -extent 1024x1024 mobile/assets/school-assets/vitana/app-icon-1024.png
```

Also create a default `school-configs.json`:

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
    "isWhiteLabel": false,
    "easProjectId": "REPLACE_AFTER_EAS_PROJECT_CREATION"
  }
}
```

### 6.16 Step 15 — EAS Configuration

```json
// mobile/eas.json
{
  "cli": {
    "version": ">= 10.0.0",
    "appVersionSource": "remote",
    "requireCommit": false
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "development",
        "SCHOOL_ID": "vitana"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "staging",
        "SCHOOL_ID": "vitana"
      }
    },
    "staging": {
      "channel": "staging",
      "android": { "buildType": "app-bundle" },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "staging",
        "SCHOOL_ID": "vitana"
      }
    },
    "production": {
      "channel": "production",
      "android": {
        "buildType": "app-bundle",
        "credentialsSource": "remote"
      },
      "ios": {
        "credentialsSource": "remote"
      },
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "production",
        "SCHOOL_ID": "vitana"
      }
    },
    "school-production": {
      "extends": "production",
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://api.vitanasms.com/api",
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      },
      "ios": {
        "ascAppId": "REPLACE_WITH_ASC_APP_ID"
      }
    }
  }
}
```

---

## PHASE 7: AI/ML Integration

> **Not applicable for this foundation prompt.**  
> AI features (assignment helper, smart attendance anomaly detection) are Phase 5+ items.

---

## PHASE 8: External Integrations

### 8.1 Expo EAS (Build & Update)

```bash
# 1. Login to EAS
eas login
# Email: ops@vitanasms.com

# 2. Create the EAS project (run ONCE, from mobile/ directory)
cd mobile
eas project:init
# This updates eas.json with the projectId

# 3. Update school-configs.json with the projectId
# Edit: scripts/school-configs.json → vitana.easProjectId

# 4. Configure credentials (run once per platform)
eas credentials --platform android
eas credentials --platform ios
```

### 8.2 Sentry Setup

```bash
# 1. Create Sentry project at https://sentry.io
# Organization: vitana-technologies
# Project: vitana-mobile
# Platform: React Native

# 2. Copy DSN to .env.local
EXPO_PUBLIC_SENTRY_DSN=https://xxxx@o1234.ingest.sentry.io/1234

# 3. Add Sentry plugin to app.config.js (add after expo-router plugin)
['@sentry/react-native/expo', {
  organization: 'vitana-technologies',
  project: 'vitana-mobile',
  // Source maps uploaded automatically on EAS build
}],
```

---

## PHASE 9: Testing & Validation

### 9.1 Unit Tests

```typescript
// packages/shared-utils/src/__tests__/formatters.test.ts
import {
  formatINR, formatAttendancePercent, maskAadhaar,
  getAttendanceColor, getAmountBucket, semverLt, generateUUID,
} from '../formatters';

describe('formatINR', () => {
  it('formats thousands correctly', () => {
    expect(formatINR(1500)).toBe('₹1,500');
  });
  it('formats lakhs correctly', () => {
    expect(formatINR(150000)).toBe('₹1,50,000');
  });
  it('handles zero', () => {
    expect(formatINR(0)).toBe('₹0');
  });
});

describe('maskAadhaar', () => {
  it('masks first 8 digits', () => {
    expect(maskAadhaar('123456789012')).toBe('XXXX-XXXX-9012');
  });
  it('handles non-digit input gracefully', () => {
    expect(maskAadhaar('1234-5678-9012')).toBe('XXXX-XXXX-9012');
  });
});

describe('getAttendanceColor', () => {
  it('returns success for >= 85%', () => {
    expect(getAttendanceColor(92)).toBe('success');
    expect(getAttendanceColor(85)).toBe('success');
  });
  it('returns warning for 75-84%', () => {
    expect(getAttendanceColor(79)).toBe('warning');
  });
  it('returns danger for < 75%', () => {
    expect(getAttendanceColor(74)).toBe('danger');
    expect(getAttendanceColor(0)).toBe('danger');
  });
});

describe('getAmountBucket', () => {
  it('buckets amounts correctly', () => {
    expect(getAmountBucket(3000)).toBe('<5k');
    expect(getAmountBucket(5000)).toBe('5k-20k');
    expect(getAmountBucket(20000)).toBe('20k-50k');
    expect(getAmountBucket(75000)).toBe('>50k');
  });
});

describe('semverLt', () => {
  it('1.0.0 < 1.1.0', () => expect(semverLt('1.0.0', '1.1.0')).toBe(true));
  it('1.1.0 not < 1.0.0', () => expect(semverLt('1.1.0', '1.0.0')).toBe(false));
  it('equal versions', () => expect(semverLt('1.0.0', '1.0.0')).toBe(false));
});

describe('generateUUID', () => {
  it('generates valid UUID v4', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('generates unique UUIDs', () => {
    expect(generateUUID()).not.toBe(generateUUID());
  });
});
```

```typescript
// mobile/src/stores/__tests__/authStore.test.ts
import { useAuthStore } from '../authStore';

const mockUser = {
  id: 'user-1', username: 'test@school.com', email: 'test@school.com',
  role: 'Parent' as const, schoolId: 'school-1', fullName: 'Test User', linkedEntityId: 'guardian-1',
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('setAuth populates all fields', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token');
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('clearAuth resets all fields', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token');
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('updateTokens replaces tokens only', () => {
    useAuthStore.getState().setAuth(mockUser, 'old-token', 'old-refresh');
    useAuthStore.getState().updateTokens('new-token', 'new-refresh');
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-token');
    expect(state.refreshToken).toBe('new-refresh');
    expect(state.user).toEqual(mockUser); // unchanged
  });
});
```

### 9.2 Run Tests

```bash
# From repo root
pnpm --filter @vitana/shared-utils test
pnpm --filter @vitana/mobile test

# Type check
pnpm --filter @vitana/shared-types build
pnpm --filter @vitana/mobile typecheck

# Lint
pnpm --filter @vitana/mobile lint
```

### 9.3 Validation Checklist

- [ ] `pnpm --filter @vitana/shared-types build` exits 0
- [ ] `pnpm --filter @vitana/shared-utils test` all tests pass
- [ ] `pnpm --filter @vitana/mobile typecheck` 0 errors
- [ ] `pnpm --filter @vitana/mobile lint` 0 errors
- [ ] App boots on Android emulator — auth screen visible
- [ ] App boots on iOS simulator — auth screen visible
- [ ] App boots on physical Android — auth screen visible
- [ ] Network tab shows `Authorization`, `X-Academic-Year`, `X-Correlation-ID` headers
- [ ] Token stored in SecureStore (verified via Expo Go DevTools)
- [ ] School store primary color is `#1a6fd8`
- [ ] Tab bar uses primary color for active icon
- [ ] Fonts render as Poppins (headings) and Inter (body text)
- [ ] MOCK_APP_CONFIG imported and usable without errors

---

## PHASE 10: Documentation & Verification

### 10.1 Create `mobile/README.md`

````markdown
# Vitana SMS — Mobile App

React Native + Expo SDK 52 mobile application for the Vitana School ERP.

## Quick Start

```bash
# From repo root
pnpm install

# Start development server
pnpm --filter @vitana/mobile start

# Open on Android device (USB debugging enabled)
pnpm --filter @vitana/mobile android

# Open on iOS simulator (macOS only)
pnpm --filter @vitana/mobile ios
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp mobile/.env.example mobile/.env.local
```

## Running on Physical Device

See: `docs/mobile_application_docs/MOBILE-DEV-GUIDE.md`

## Architecture Docs

See: `docs/mobile_application_docs/`
````

### 10.2 Verification Commands (Run All in Order)

```bash
# 1. Install all workspace packages
pnpm install

# 2. Build shared packages
pnpm --filter @vitana/shared-types build
pnpm --filter @vitana/shared-utils build

# 3. Run tests
pnpm --filter @vitana/shared-utils test
pnpm --filter @vitana/mobile test

# 4. Type check
pnpm --filter @vitana/mobile typecheck

# 5. Lint
pnpm --filter @vitana/mobile lint

# 6. Start dev server
pnpm --filter @vitana/mobile start

# Open on Android emulator (in another terminal)
pnpm --filter @vitana/mobile android

# Open on iOS simulator (macOS only, in another terminal)
pnpm --filter @vitana/mobile ios
```

### 10.3 Git Commit

```bash
git add .
git commit -m "feat(mobile): add mobile app foundation

- pnpm monorepo: mobile/ + packages/shared-types + packages/shared-utils
- Expo SDK 52 + Expo Router v4 file-based navigation
- Axios API client with JWT refresh queue + envelope unwrapping
- Zustand auth store persisted to Expo SecureStore
- Zustand school store persisted to AsyncStorage
- NativeWind v4 with exact Vitana design tokens (matches web)
- Role-based navigation skeleton: parent/teacher/student/admin/super-admin
- Sentry crash reporting initialized
- TypeScript strict mode throughout
- All shared-utils tests passing

Packages: @vitana/shared-types, @vitana/shared-utils, @vitana/mobile
Next: PROMPT-02 (Authentication screens)"
```

---

**END OF PROMPT-01**
