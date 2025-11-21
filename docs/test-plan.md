# Skate Bounty App – Test Plan

This plan enumerates end-to-end and integration checks covering the behaviors implemented in the current codebase. It assumes a configured Supabase backend (auth, tables, and RPCs) and valid `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment values.

## 1) Authentication & Access Control
- **Session bootstrap**: Launch app with valid stored session; verify AuthProvider populates session and tabs render without redirect.
- **Unauthenticated guard**: Start signed out and attempt to open tab routes; expect redirect to `/login` and hidden headers.
- **Email/password sign-in**: Enter valid credentials; expect navigation to root tabs and session persisted.
- **Email/password sign-up**: Toggle to sign-up, create account, and confirm notice about email confirmation when enabled.
- **Inline errors**: Submit with missing fields or Supabase error (e.g., bad password policy); confirm error banner surfaces message and buttons remain enabled after failure.
- **Sign out**: From Profile tab, trigger sign out; expect session cleared and subsequent tab access redirects to login.

## 2) Home Feed (Bounties list)
- **Initial load**: Verify loading indicator then populated cards showing trick, reward label, created time, status badge, and optional spot chip.
- **Profile hydration**: Confirm posters display handles when available; fallback to truncated user id otherwise.
- **Filtering**: Toggle Mine vs All (requires login) and status segment (All/Open/Closed); list updates and stats reflect filter text.
- **Search**: Enter queries matching trick, reward, reward type, spot title, or handle; results filter accordingly. Clearing resets list.
- **Refresh**: Pull-to-refresh reloads bounties and spots without errors.
- **Realtime**: Post/patch/delete bounty in backend; feed updates through subscription (insert, update, delete).
- **Navigation**: Tapping bounty opens detail screen; tapping spot chip opens spot detail.

## 3) Create Bounty Flow
- **Spots preload**: Confirm spots list loads and first spot auto-selected when available; empty state when none.
- **Validation**: Trick required; reward numeric and non-negative when provided; expiration must be valid date; form blocks submit on validation errors with inline messages.
- **Reward type & status chips**: Tapping options toggles active styling and value used in submission payload.
- **Attach/detach spot**: Selecting a spot marks it attached; tapping again clears selection.
- **Submission success**: With valid data and session, create bounty; expect success alert, form reset, and new bounty visible in Home feed.
- **Auth requirement**: Attempt submission while signed out triggers form-level error.
- **Error handling**: Simulate Supabase failure; confirm alert and error message display without losing input state.

## 4) Spots Tab
- **List load**: Verify existing spots render with title, optional image URL, coordinates, created date, and “Open” pill.
- **Search filter**: Query by title or image URL; Clear resets input.
- **Coordinates toggle**: If any spots have lat/lng, enable “show only mapped spots” toggle and verify filtering.
- **Create validation**: Title required; image URL must be http/https; lat/lng must both be provided and numeric; auth required. Inline errors appear per field and form stops submission.
- **Create success**: With valid input and session, create spot; new spot prepends to list and form clears.
- **Navigation**: Tapping a spot opens its detail screen.

## 5) Bounty Detail, Acceptance & Submissions
- **Load state**: Missing/invalid id shows error card; valid id loads bounty metadata, status badge, created/expiry pills, owner handle, and linked spot when present.
- **Owner status toggle**: If viewing as creator, toggle status between open/closed; pill and backend update, with success alert and loading state on button.
- **Accept bounty**: Signed-in user can accept bounty via RPC; accepted badge persists across reload. Signed-out users see auth prompt when attempting.
- **Submit proof**: After acceptance, paste Instagram URL; invalid URLs flagged inline. On success, timestamp fetch attempted, submission stored via RPC, form clears, and submissions list refreshes. Duplicate submission blocked server-side.
- **Submission display**: Existing submission shows embed/links, posted/submitted timestamps, and notice about one-per-user limit.
- **Voting**: View submissions sorted by vote count; voting increments badge and disables repeat votes. Unvoting decreases count. Signed-out users should be prompted to sign in before voting (via upstream RPC constraints).
- **Spot link**: When bounty has spot, card shows title, media URL, coordinates, and no-spot fallback.

## 6) Spot Detail Screen
- **Load states**: Missing/invalid id surfaces appropriate error card; loading indicator shown during fetch.
- **Details**: Title, optional image, coordinates (with Open in Maps link), and created date render correctly. No-coordinate message shown when absent.
- **Bounties at spot**: Linked bounties list displays reward pill, status badge, trick, dates, and navigation button to bounty detail.

## 7) Profile & Activity
- **Profile load**: Signed-in user sees email, user id, and optional handle with authenticated pills; signed-out user sees “Signed out” card.
- **Handle update**: Empty handle blocked with error; valid handle saved via upsert, success message shown, and value persists after reload.
- **Activity summaries**: Recent bounties, acceptances, and submissions load (up to five each), showing status/reward, vote counts, and timestamps. Empty states message when none; loading placeholders shown while fetching.
- **Navigation shortcuts**: Buttons inside acceptances list open related bounty details.

## 8) Cross-cutting UX
- **Theming & layout**: Verify headers, tab icons, pills/badges, and status bar colors align with palette constants across screens.
- **Keyboard handling**: On create and bounty detail screens, keyboard avoiding behavior prevents fields from being obscured on iOS/Android.
- **Error resilience**: Force Supabase/network failures (e.g., offline); ensure user-friendly alerts and no crashes across fetches and mutations.
