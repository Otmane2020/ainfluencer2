

# Fix: Infinite Refresh Loop in Campaign Wizard

## Problem Identified

The infinite refresh loop is caused by a **cascade of state updates** between the `fetchProjects` function and the auto-suggest `useEffect`:

### Root Cause Analysis

```text
┌─────────────────────────────────────────────────────────────┐
│                    INFINITE LOOP CYCLE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Modal opens → fetchProjects() called                    │
│                         ↓                                    │
│  2. setProjects(data) + setProjectId(data[0].id)           │
│                         ↓                                    │
│  3. useEffect [projectId, step] triggers                    │
│                         ↓                                    │
│  4. loadServicesFromCache() → setServiceTags()              │
│                         ↓                                    │
│  5. Component re-renders                                     │
│                         ↓                                    │
│  6. projects.find() returns undefined (stale closure)       │
│                         ↓                                    │
│  7. Next render: projects updated → triggers again          │
│                         ↓                                    │
│  8. LOOP CONTINUES                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Issues Found

1. **Missing `projects` in dependency array**: The `useEffect` at line 219-229 uses `projects.find()` but doesn't include `projects` in its dependency array, causing stale closure issues.

2. **Race condition**: `fetchProjects()` sets both `projects` AND `projectId` in sequence, triggering the auto-suggest effect before `projects` is fully updated.

3. **No loading guard**: The `loadServicesFromCache` function doesn't check if a load is already in progress, potentially causing duplicate calls.

---

## Solution

### Step 1: Add Loading State Guard

Add a `useRef` to track if services are currently being loaded, preventing duplicate calls:

```typescript
const isLoadingServicesRef = useRef(false);
```

### Step 2: Fix useEffect Dependencies and Guards

Update the auto-suggest `useEffect` to:
- Add `projects` to the dependency array
- Check if projects array is populated before proceeding
- Use the loading ref guard

```typescript
useEffect(() => {
  // Guard: Only on step 2
  if (step !== 2) return;
  
  // Guard: Must have projects loaded
  if (projects.length === 0) return;
  
  // Guard: Must have projectId
  if (!projectId) return;
  
  // Guard: Already processed this project
  if (autoSuggestedProjectIdRef.current === projectId) return;
  
  // Guard: Already have tags
  if (serviceTags.length > 0) return;
  
  // Guard: Already loading
  if (isLoadingServicesRef.current) return;
  
  const selectedProject = projects.find(p => p.id === projectId);
  if (!selectedProject?.url) return;

  autoSuggestedProjectIdRef.current = projectId;
  loadServicesFromCache(projectId, selectedProject.url);
}, [projectId, step, projects.length, serviceTags.length]);
```

### Step 3: Add Loading Guard to loadServicesFromCache

```typescript
const loadServicesFromCache = async (projId: string, url: string) => {
  if (isLoadingServicesRef.current) return; // Prevent duplicate calls
  
  isLoadingServicesRef.current = true;
  setIsSuggestingProduct(true);
  
  try {
    // ... existing logic ...
  } finally {
    setIsSuggestingProduct(false);
    isLoadingServicesRef.current = false;
  }
};
```

### Step 4: Reset Loading Ref on Modal Close

In the reset section:

```typescript
useEffect(() => {
  if (isOpen) {
    fetchProjects();
    // Reset form
    setStep(1);
    // ... other resets ...
    autoSuggestedProjectIdRef.current = null;
    isLoadingServicesRef.current = false; // Reset loading guard
    // ...
  }
}, [isOpen]);
```

---

## File Changes

| File | Change |
|------|--------|
| `src/components/campaigns/CampaignWizardModal.tsx` | Add `isLoadingServicesRef`, fix `useEffect` dependencies, add loading guards |

---

## Technical Details

The fix ensures:

1. **No race conditions**: The effect waits for `projects` to be populated before attempting to find the selected project
2. **No duplicate calls**: The `isLoadingServicesRef` prevents multiple simultaneous API calls
3. **Proper cleanup**: All refs are reset when the modal reopens
4. **Stable dependencies**: Using `.length` as dependency instead of the full array prevents unnecessary re-triggers

