# Vitana Mobile Design System

> **Version**: 2.0  
> **Last Updated**: June 2026  
> **Stack**: React Native 0.85 · Expo SDK 56 · NativeWind 4 · Reanimated 4

---

## Overview

The Vitana design system provides a set of design tokens, reusable components, and patterns that ensure visual consistency across all 91 screens of the Vitana School Management app. It supports dynamic white-label branding at the school level.

---

## Design Tokens

All tokens are defined in `src/theme/tokens.ts`.

### Colors

```typescript
VITANA_COLORS = {
  // Brand
  primary: '#1a6fd8',        // Vitana Blue
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  accent: '#17a2b8',         // Vitana Teal

  // Surfaces
  background: '#ffffff',
  surface: '#f5f7fa',        // Page background

  // Typography
  text: '#1a1a2e',           // Primary text
  textSecondary: '#6b7280',  // Secondary / hint text

  // Borders
  border: '#e5e7eb',

  // Semantic
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  // Navigation sidebar
  sidebar: '#1e293b',
}
```

**White-label override**: Schools can override `primary` and `accent` at runtime via `schoolStore.branding`. The `SchoolThemeProvider` derives `primaryLight`, `primaryDark`, `accentLight`, `accentDark` automatically.

### Shadows

```typescript
VITANA_SHADOWS = {
  sm:   { shadowColor: '#000', shadowOffset: {width:0,height:1}, shadowOpacity:0.06, shadowRadius:4,  elevation:2 },
  md:   { shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity:0.10, shadowRadius:8,  elevation:4 },
  lg:   { shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity:0.15, shadowRadius:16, elevation:8 },
  card: { shadowColor: '#1a6fd8', shadowOffset: {width:0,height:2}, shadowOpacity:0.08, shadowRadius:12, elevation:4 },
}
```

### Gradients

```typescript
VITANA_GRADIENTS = {
  auth:    ['#0d1b3e', '#1a3a7a', '#1a6fd8'],  // Login screen background
  header:  ['#1a6fd8', '#1d4ed8'],              // Dashboard headers
  card:    ['#ffffff', '#f5f7fa'],
  success: ['#22c55e', '#16a34a'],
  warning: ['#f59e0b', '#d97706'],
}
```

### Spacing

```typescript
VITANA_SPACING = { xs:4, sm:8, md:16, lg:24, xl:32, '2xl':48, '3xl':64 }
```

### Border Radius

```typescript
VITANA_BORDER_RADIUS = { sm:6, md:10, lg:14, xl:20, full:9999 }
```

### Font Sizes

```typescript
VITANA_FONT_SIZES = { xs:11, sm:13, base:15, lg:17, xl:20, '2xl':24, '3xl':30, '4xl':36 }
```

### Fonts

| Token | Value | Usage |
|---|---|---|
| `heading` | `Poppins` | Titles, section headers, dashboard names |
| `body` | `Inter` | Body text, labels, metadata, lists |
| `mono` | `SpaceMono` | Code, timestamps, IDs |

---

## Component Library

All components are exported from `src/components/ui/index.ts`.

```typescript
import { Button, Input, Card, Badge, Avatar, ScreenHeader, SubScreenHeader,
         StatCard, SectionCard, ListRow, BottomSheet, EmptyState } from '@/components/ui';
```

---

### Button

Primary action component with haptic feedback and press animation.

```typescript
<Button
  label="Sign In"
  onPress={handleSubmit}
  variant="primary"        // 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size="md"               // 'sm' | 'md' | 'lg'
  loading={isSubmitting}
  disabled={false}
  icon={<Feather name="arrow-right" size={16} color="#fff" />}
  iconPosition="right"    // 'left' | 'right'
  fullWidth={true}
  primaryColor={primaryColor}  // for dynamic school branding
/>
```

**Behavior**: Scales to 0.97 on press (Reanimated spring), fires `Haptics.impactAsync(Light)`.

---

### Input

Form field with label, Feather icon, animated focus border, and error state.

```typescript
<Input
  label="Username"
  value={value}
  onChangeText={onChange}
  placeholder="Enter your username"
  icon="user"                     // Feather icon name
  rightIcon="eye"                 // for password toggle
  onRightIconPress={togglePassword}
  error={errors.username?.message}
  hint="Your school username"
  primaryColor={primaryColor}
/>
```

**Key detail**: Uses `StyleSheet` (NOT NativeWind `border` class) to avoid the RN TextInput border rendering bug.

---

### Card

White surface with platform-appropriate shadow.

```typescript
<Card shadow="sm" padding={16} borderRadius={14} onPress={handlePress}>
  {children}
</Card>
```

---

### Badge

Status pill with semantic color variants.

```typescript
<Badge label="Present" variant="success" size="sm" dot />
// variants: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'
```

---

### Avatar

User initials fallback + image support with consistent color mapping.

```typescript
<Avatar name="John Doe" uri={photoUrl} size="md" />
// sizes: 'xs'(28) | 'sm'(36) | 'md'(44) | 'lg'(56) | 'xl'(72)
```

---

### ScreenHeader

Gradient header for root dashboard screens (tab bar screens).

```typescript
<ScreenHeader
  title="School Name"
  subtitle="Secondary info"
  primaryColor={primaryColor}
  showBack={false}
  rightSlot={<NotificationButton />}
  variant="gradient"     // 'gradient' | 'solid' | 'transparent'
/>
```

---

### SubScreenHeader

White header for pushed feature screens (replaces the manual header pattern).

```typescript
<SubScreenHeader
  title="Leave Requests"
  subtitle="3 pending"
  rightSlot={<FilterButton />}
/>
```

---

### StatCard

KPI tile for dashboard stat rows.

```typescript
<StatCard
  label="Today's Classes"
  value={5}
  icon="book-open"
  iconColor={VITANA_COLORS.primary}
  trend={{ value: 12, isPositive: true }}
/>
```

---

### SectionCard

Titled card section wrapping content rows.

```typescript
<SectionCard
  title="Today's Schedule"
  icon="clock"
  iconColor={primaryColor}
  onViewAll={() => router.push('/timetable')}
  noPadding
>
  {rows}
</SectionCard>
```

---

### ListRow

Touch-able list item with icon, title, subtitle, badge, and chevron.

```typescript
<ListRow
  title="Attendance"
  subtitle="Mark today's attendance"
  icon="user-check"
  iconColor={primaryColor}
  badge={3}
  onPress={() => router.push('/attendance')}
  showChevron
  destructive={false}
/>
```

---

### BottomSheet

Reanimated slide-up sheet replacing the `Modal + justifyContent: flex-end` pattern.

```typescript
<BottomSheet
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Filter Options"
>
  {content}
</BottomSheet>
```

---

### EmptyState

Centered empty state with icon, title, subtitle, and optional CTA.

```typescript
<EmptyState
  icon="inbox"
  title="No classes today"
  subtitle="Enjoy your free day!"
  action={{ label: "View Timetable", onPress: () => router.push('/timetable') }}
/>
```

---

## Theming & Dynamic Branding

### Access the theme

```typescript
import { useAppTheme } from '@/theme';
const { colors, fonts, spacing } = useAppTheme();

// Or the lighter hook for just primary/accent/school info:
import { useSchoolTheme } from '@/theme/useSchoolTheme';
const { primaryColor, accentColor, schoolName, logoUrl } = useSchoolTheme();
```

### Branding override chain

```
Runtime schoolStore.branding.primaryColor
    ↓ fallback
build-time expoConfig.extra.buildTimePrimaryColor
    ↓ fallback
VITANA_COLORS.primary (#1a6fd8)
```

---

## Styling Convention

| Approach | When to use |
|---|---|
| `StyleSheet.create()` with VITANA tokens | All new components and screens |
| Inline `style={}` | Dynamic values only (primaryColor, calculated widths) |
| NativeWind `className=` | Simple layout utilities (`flex-1`, `items-center`) only — NOT for borders or backgrounds on TextInput |

**Never** use NativeWind `border` class on a `TextInput` — React Native silently drops it. Use `borderWidth: 1.5` in the style prop instead.

---

## Screen Layout Pattern

Every screen follows this structure:

```tsx
<SafeAreaView style={{ flex: 1, backgroundColor: VITANA_COLORS.surface }} edges={['top']}>
  {/* Dashboard root: <ScreenHeader> | Feature sub-screen: <SubScreenHeader> */}
  <ScreenHeader title={schoolName} primaryColor={primaryColor} rightSlot={...} />

  <ScrollView showsVerticalScrollIndicator={false} refreshControl={...}>
    <View style={{ padding: 16, paddingBottom: 32, gap: 14 }}>
      {isLoading ? <SkeletonLoader /> : null}
      {!isLoading && !data ? <EmptyState /> : null}
      {data ? <ContentCards /> : null}
    </View>
  </ScrollView>
</SafeAreaView>
```
