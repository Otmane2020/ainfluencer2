

## Fix: Campaign Posts Publishing to Wrong Social Accounts

### Problem Identified
The `run-campaigns-cron` function publishes all posts using the **global** Meta connection (`meta_connections` table), ignoring the **per-project** page and Instagram selections stored on each project (`meta_page_id`, `meta_instagram_id`).

This means Starlinko campaign posts are being published to ClipMotion's Instagram/Facebook page (or vice versa) because the system only looks at the single `meta_connections` record for the user.

### Root Cause
- **Line 867-871** in `run-campaigns-cron/index.ts`: fetches Meta connection by `user_id` only
- The `publishToFacebook` and `publishToInstagram` functions use `metaConnection.page_id` and `metaConnection.instagram_id` directly
- The project-level fields (`projects.meta_page_id`, `projects.meta_instagram_id`) are never consulted during publishing

### Fix Plan

**File: `supabase/functions/run-campaigns-cron/index.ts`**

1. After fetching the global `metaConnection` (for the access token), override `page_id` and `instagram_id` with the project-specific values when they exist:

```text
// Pseudo-code of the change:
const projectMetaPageId = post.projects?.meta_page_id;
const projectMetaInstagramId = post.projects?.meta_instagram_id;

// Override connection with project-specific targets
if (projectMetaPageId) {
  metaConnection.page_id = projectMetaPageId;
}
if (projectMetaInstagramId) {
  metaConnection.instagram_id = projectMetaInstagramId;
}
```

2. Update the `scheduled_posts` SELECT query (line 720-721) to also fetch `meta_page_id` and `meta_instagram_id` from the joined `projects` table.

3. Update the `ProjectContext` interface to include `meta_page_id` and `meta_instagram_id` fields.

4. Add a `page_access_token` override: Since different pages may require different page tokens, we need to fetch the correct page token from Meta's API using the user access token. If the global connection's `page_access_token` matches the project's page, it can be reused. Otherwise, fetch page tokens via the Pages API.

### Technical Details

- The `projects` table already stores `meta_page_id`, `meta_instagram_id`, and `meta_instagram_username` per project
- The global `meta_connections` table stores the OAuth user token + one default page
- For multi-page support, the page access token must be fetched dynamically via `GET /{page_id}?fields=access_token&access_token={user_token}`
- This ensures each project publishes to its designated Facebook Page and Instagram account

### Changes Summary
- **1 file modified**: `supabase/functions/run-campaigns-cron/index.ts`
  - Add `meta_page_id`, `meta_instagram_id` to project select query
  - After fetching global Meta connection, override with project-specific page/IG IDs
  - Fetch correct page access token for the target page via Meta Graph API
  - Deploy updated function

