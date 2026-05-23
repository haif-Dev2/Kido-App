# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Kido** — a babysitting marketplace app (final-year mémoire 2025–2026). Parents find and book verified babysitters in Algiers. Built with Expo + React Native, Supabase backend, NativeWind styling. Currently uses mock data; Supabase integration is wired but not fully connected.

## Commands

```bash
# Start dev server (scan QR with Expo Go, or press a/i/w for platform)
npm start

# Platform shortcuts
npm run android   # opens Android emulator
npm run ios       # opens iOS simulator
npm run web       # opens browser

# Lint
npm run lint      # runs expo lint (ESLint with expo config)
```

> There is no test suite configured. No `npm test` command exists.

**Important:** `react-native-maps` does **not** work in Expo Go. The `Map` component in `components/ui/Map.tsx` detects this and shows a placeholder. To see the real map, run a development build (`expo run:android` / `expo run:ios`).

## Architecture

### Routing — Expo Router (file-based)

All screens live under `app/`. The entry point `app/index.tsx` redirects to `/onboarding` (guest) or `/(tabs)` (authenticated) based on the Supabase session.

```
app/
  index.tsx                  ← root redirect
  onboarding.tsx / login.tsx / register*.tsx
  (tabs)/
    _layout.tsx              ← bottom tab navigator (Home, Search, Bookings, Profile)
    index.tsx                ← Home tab
    search.tsx               ← Search + map view
    bookings.tsx             ← Booking list
    profile.tsx
  sitter/[id].tsx            ← Sitter detail (slide_from_right)
  booking/
    new/[sitterId].tsx       ← New booking (modal, slide_from_bottom)
    [id].tsx                 ← Booking detail (slide_from_right)
  review/new/[bookingId].tsx ← Leave review (modal)
  notifications.tsx
```

### Styling — two systems in use

**NativeWind (Tailwind)** is the primary system for newer screens (e.g., `booking/[id].tsx`, `components/ui/Button.tsx`). Use `className="..."` with tokens defined in `tailwind.config.js`.

**`StyleSheet.create`** is used in older/legacy screens (e.g., `app/(tabs)/search.tsx`, `app/sitter/[id].tsx`). Both co-exist; prefer NativeWind for new code.

Design tokens are defined in two places:
- `tailwind.config.js` — NativeWind tokens (`bg-primary`, `text-text-muted`, `surface-2`, etc.)
- `constants/theme.ts` — JS constants (`colors`, `typography`, `spacing`, `radius`, `shadow`) for StyleSheet usage

**Fonts:** Three families loaded in `app/_layout.tsx` (fonts don't block rendering):
- **Plus Jakarta Sans** → display/headings (`font-display`, `font-display-bold`, `font-heading`)
- **Inter** → body text (`font-body`, `font-body-semi`, `font-body-bold`)
- **Fraunces** → serif accents (used sparingly)

### State management — Zustand

All stores are in `store/`:
- `auth-store.ts` — session, user, role; has `mockLoginAs(role)` for dev
- `favorites-store.ts` — persisted favorite sitter IDs (AsyncStorage)
- `location-store.ts` — tracks sitter locations by ID; Haversine distance math
- `registration-store.ts` — multi-step registration form state

### Auth — Supabase + AuthProvider

`providers/auth-provider.tsx` wraps the app with a React context that holds `session`, `profile`, and `loading`. It reads from Supabase's `profiles` table. The root `app/index.tsx` uses `useAuth()` for the redirect.

Supabase credentials are read from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars. Session storage: SecureStore on native, AsyncStorage on web.

### Mock data

`lib/mock/sitters.ts` and `lib/mock/bookings.ts` hold all test data. `MockSitter` extends the domain `BabySitter` type with UI-specific fields including `latitude`/`longitude` (Algiers neighborhood coordinates).

Most screens currently read from mock data, not Supabase.

### Map component

`components/ui/Map.tsx` lazy-requires `react-native-maps` only when the native module is present (dev build). In Expo Go it renders a placeholder. `components/ui/Map.web.tsx` handles the web platform via Metro's platform-specific resolution.

### Key UI primitives (`components/ui/`)

- `Button.tsx` — animated press scale, `variant` (primary/secondary/ghost/destructive/soft), `size` (sm/md/lg), haptic feedback, Lucide icons
- `Avatar.tsx`, `Rating.tsx`, `Badge.tsx`, `Chip.tsx`, `Skeleton.tsx`, `EmptyState.tsx`
- `Map.tsx` / `Map.web.tsx` — cross-platform map with graceful Expo Go fallback
- `Input.tsx` / `CustomInput.tsx` — two input implementations (legacy vs. current)

### Location / tracking

`lib/location-service.ts` — `expo-location` wrapper; starts/stops periodic GPS sharing.  
`components/SitterDistanceTracker.tsx` — live distance display (text) using Haversine.  
`components/LocationSharingToggle.tsx` — parent UI to enable/disable sharing.

### Haptics

All interactive elements use `lib/haptics.ts` (`haptics.tap()`, `haptics.light()`, `haptics.medium()`, `haptics.warning()`, `haptics.success()`).

## Metro / build notes

`metro.config.js` patches resolver conditions on web to prefer `require` over `import` — this fixes Zustand v5's ESM build on web. Do not remove this patch.

`babel.config.js` sets `jsxImportSource: 'nativewind'` — required for NativeWind v4 className support.
