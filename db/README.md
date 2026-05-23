# Kido — Database

Supabase schema, triggers, RLS policies, and seed data for the Kido app.

## Files

| File | What it does |
|---|---|
| `schema.sql` | **Main schema.** Enums, tables, indexes, triggers, functions, row-level security, storage buckets + policies. Idempotent. |
| `seed.sql` | Optional sample sitters (Amina, Yasmine, Fatima, Nour, Lina) matching the mock data in the app. Needs real user UUIDs. |

## Apply

1. Open the Supabase dashboard for project `udrmlimrbhimfmisfvtw`.
2. Go to **SQL Editor → New query**.
3. Paste the contents of `schema.sql` and click **Run**. It should finish with no errors.
4. Confirm new tables exist under **Table Editor**: `profiles`, `parent_details`, `babysitter_details`, `admin_details`, `identity_documents`, `availabilities`, `bookings`, `reviews`, `notifications`.

## Model overview

- **auth.users** (Supabase built-in) → 1:1 → **profiles** (id references auth.users)
- **profiles** → 1:1 → **parent_details** / **babysitter_details** / **admin_details** (depending on `role`)
- **profiles** (BABY_SITTER) → has many → **availabilities**, **identity_documents**
- **profiles** (PARENT) → has many → **bookings** (parent_id)
- **profiles** (BABY_SITTER) → has many → **bookings** (babysitter_id)
- **bookings** (COMPLETED) → 1:1 → **reviews**
- **profiles** → has many → **notifications**

## Automatic behaviour (triggers)

| Event | What happens |
|---|---|
| New user signs up via Supabase Auth | `profiles` row auto-inserted, plus role-specific details row (`parent_details` / `babysitter_details` / `admin_details`). Role comes from `signUp({ options: { data: { role: '…' } } })`. |
| Review inserted/deleted | Sitter's `average_rating` and `reviews_count` recalculated. Sitter receives a notification. |
| Identity document set to `VERIFIED` | Sitter's `identity_verified` flipped to `true`, notification sent. Rejection also notifies. |
| Booking inserted | Code auto-generated (`328-047` style), `total_price` computed if zero. Sitter notified. |
| Booking status changes | Parent notified on `CONFIRMED` / `DECLINED`. |

## Row Level Security — quick summary

| Table | Read | Write |
|---|---|---|
| `profiles` | Self + all validated sitters + admin | Self + admin |
| `babysitter_details` | Validated rows (public) + self + admin | Self + admin |
| `parent_details` | Self + admin | Self |
| `identity_documents` | Self + admin | Self (only while PENDING) + admin |
| `bookings` | Parent (own) + sitter (own) + admin | Parent creates; both can update; admin all |
| `reviews` | Everyone | Parent on their COMPLETED booking |
| `notifications` | Self + admin | Self (mark read), system (via triggers) |

`is_admin()` helper function is used inside policies — it checks `admin_details` for the current `auth.uid()`.

## Storage

| Bucket | Purpose | Public? |
|---|---|---|
| `avatars` | Profile photos | ✅ public read |
| `identity-documents` | National ID scans | ❌ private (owner + admin only) |

Upload path convention: **`{user_id}/{filename}`**. The RLS policy inspects the first folder in the path to confirm ownership.

## Wiring the app to real data

Once the schema is applied, the next step is to replace the mock imports in the React Native app:

| Current (mock) | Replace with |
|---|---|
| `import { MOCK_SITTERS } from '../lib/mock/sitters'` | `await supabase.from('babysitter_details').select('*, profiles(*)').eq('is_validated', true)` |
| `import { MOCK_BOOKINGS } from '../lib/mock/bookings'` | `await supabase.from('bookings').select('*, babysitter:profiles!babysitter_id(*)').eq('parent_id', session.user.id)` |
| `setTimeout(…)` booking submit | `await supabase.from('bookings').insert({...})` |
| Hardcoded "Sarah Johnson" | `await supabase.from('profiles').select('*').eq('id', session.user.id).single()` |

Let me know when you've run the schema and I'll swap the mock imports for real queries.
