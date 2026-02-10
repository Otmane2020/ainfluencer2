

# Fix: Per-Project Facebook/Instagram Page Selection

## Problem
When you select a Facebook page (e.g., "ClipMotion") for one project (e.g., Starlinko), it applies to ALL projects. Two bugs cause this:

1. **Global override on load**: When loading the page list, the system fetches the "global" selected page from your Meta connection and overwrites the project-specific selection. So every project shows the same page.

2. **Global update on selection**: When you pick a page for a project, it also updates the global Meta connection setting, which then gets loaded by every other project.

## Solution

Two small but critical fixes in `ProjectDetail.tsx`:

### Fix 1 - Stop overwriting project-level selection with global value
When fetching the list of available pages, the code currently does:
```
if (data.selectedPageId) {
  setSelectedPageId(data.selectedPageId);  // <-- overwrites project setting!
}
```
This line will be removed. The project-level `selectedPageId` is already correctly set from `project.meta_page_id` when the project loads.

### Fix 2 - Stop updating the global Meta connection
When selecting a page, the code currently calls `meta-oauth?action=select-page` which updates the global `meta_connections` table. This entire block (calling the edge function to update global state) will be removed. Only the project-level `projects` table update should happen.

## Technical Details

**File**: `src/pages/ProjectDetail.tsx`

**Change 1** (lines 276-278): Remove the block that sets `selectedPageId` from the global `data.selectedPageId` returned by the pages API.

**Change 2** (lines 317-331): Remove the block that calls `meta-oauth?action=select-page` to update the global `meta_connections` record. Keep only the per-project `projects` table update.

These two changes ensure each project maintains its own independent Facebook/Instagram page selection without affecting other projects.

