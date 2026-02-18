
# Fix: Infinite Flash Loop on Choose Plan Page

## Root Cause

The `useSubscription` hook is a **standalone hook, not a shared context**. Every component that calls it creates its own independent instance with its own state and API calls.

Here is the loop that causes the infinite flash:

1. **ChoosePlanPage** mounts, calls `useSubscription()` -- starts with `isSubscribed: false, isLoading: true`
2. Edge function returns `subscribed: true` -- ChoosePlanPage navigates to `/dashboard`
3. **AppLayout** mounts with its **OWN** `useSubscription()` -- starts fresh with `isSubscribed: false, isLoading: true` -- shows loading spinner
4. AppLayout's edge function returns `subscribed: true` -- dashboard renders
5. But ChoosePlanPage had a **5-second polling interval** that may still fire during unmount, and AppLayout has a **60-second interval** -- both creating race conditions

This also explains the **dozens of duplicate API calls** visible in network logs (each component fires its own).

## Solution: Shared Subscription Context Provider

Convert `useSubscription` into a **React Context Provider** so all components share one single instance of subscription state. When ChoosePlanPage detects `isSubscribed: true` and navigates to `/dashboard`, AppLayout **already has the cached state** and renders immediately with no flash or re-fetch.

## Implementation Steps

### Step 1: Create SubscriptionProvider context
- Create `src/contexts/SubscriptionContext.tsx`
- Move all subscription logic into a Provider component
- Export a `useSubscription()` hook that reads from context
- Single source of truth: one API call shared across the entire app

### Step 2: Wrap the App with SubscriptionProvider
- In `src/App.tsx`, wrap `<BrowserRouter>` children with `<SubscriptionProvider>`
- All routes now share the same subscription state

### Step 3: Update useSubscription hook
- Replace `src/hooks/useSubscription.ts` to re-export from the context
- All existing imports (`import { useSubscription } from "@/hooks/useSubscription"`) continue working with zero changes needed in other files

### Step 4: Remove duplicate polling from ChoosePlanPage
- Remove the 5-second `setInterval` in ChoosePlanPage (the provider handles polling)
- Keep the redirect logic (`if isSubscribed, navigate to dashboard`)

## What This Fixes
- **No more flash**: AppLayout gets subscription state instantly from context (no re-fetch)
- **No more duplicate API calls**: One provider, one set of API calls
- **No more race conditions**: Single state source eliminates timing conflicts between components

## Technical Details

```text
BEFORE (broken):
ChoosePlanPage --> useSubscription() [instance 1] --> API call
AppLayout      --> useSubscription() [instance 2] --> API call (flash!)
Dashboard      --> useSubscription() [instance 3] --> API call

AFTER (fixed):
SubscriptionProvider --> single API call
  |
  +-- ChoosePlanPage reads from context (instant)
  +-- AppLayout reads from context (instant, no flash)
  +-- Dashboard reads from context (instant)
```

### Files to create
- `src/contexts/SubscriptionContext.tsx` -- new Provider + context

### Files to modify
- `src/hooks/useSubscription.ts` -- re-export from context
- `src/App.tsx` -- wrap with Provider
- `src/pages/ChoosePlanPage.tsx` -- remove duplicate polling
