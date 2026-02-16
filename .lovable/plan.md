

## Fix LinkedIn Auto-Publishing in Campaign Posts

### Problem

The automated campaign publishing system (`run-campaigns-cron`) only supports **Facebook** and **Instagram**. When a post has `linkedin` in its `platforms` array, the cron simply **skips it** -- there is no `publishToLinkedIn` function and no `if (platform === "linkedin")` block in the publishing loop (lines 933-960).

Additionally, the manual share flow in `SocialShareModal` uses a web share-offsite URL which only opens a LinkedIn browser window for the user to copy/paste -- it does not actually post via API.

### Root Cause

1. **No LinkedIn API publishing function** exists in the cron edge function
2. The LinkedIn connection stores an `access_token` with the `w_member_social` scope (which allows posting), but it is never used for automated posting
3. The cron only fetches `meta_connections` and never fetches `linkedin_connections`

### Plan

#### 1. Add LinkedIn API Publishing to `run-campaigns-cron/index.ts`

- Add a `publishToLinkedIn` function that:
  - Fetches the user's `linkedin_connections` record to get the `access_token` and `linkedin_id`
  - Uses the LinkedIn `ugcPosts` or `posts` API (v2) to create a post on the user's personal profile
  - Supports text-only posts and posts with media (image URL or video URL)
  - Returns `{ success, postId?, error? }` consistent with other platform publishers

- Add LinkedIn handling in the main publishing loop (around line 933):
  - Fetch `linkedin_connections` alongside `meta_connections`
  - Add `if (platform === "linkedin")` block calling the new function
  - Store `external_post_id` from LinkedIn response for direct linking

#### 2. Add LinkedIn Direct Post in `SocialShareModal.tsx`

- Add `linkedin` to the `directPost` platforms list
- When user clicks LinkedIn with media, call the edge function for server-side posting instead of opening a browser window

#### 3. LinkedIn Posts API Implementation Details

The function will use LinkedIn's Community Management API:
- Endpoint: `POST https://api.linkedin.com/rest/posts`
- Headers: `LinkedIn-Version: 202401`, `Authorization: Bearer {token}`
- Body format for text + media posts using `urn:li:person:{linkedinId}` as author
- For images: register upload, upload binary, then create post with image asset
- For simple text + link posts: use `article` share type with URL

### Technical Details

**New function in `run-campaigns-cron/index.ts`:**

```text
publishToLinkedIn(post, linkedinConnection) 
  -> Fetch linkedin_connections for user
  -> If image/video: Use articles share (link to media URL)
  -> POST to LinkedIn REST API
  -> Return result with postId
```

**Modified files:**
- `supabase/functions/run-campaigns-cron/index.ts` -- Add `publishToLinkedIn` + LinkedIn block in loop + fetch linkedin_connections
- `src/components/SocialShareModal.tsx` -- Enable LinkedIn as direct post platform via edge function

**No database changes needed** -- the `linkedin_connections` table already has `access_token` and `linkedin_id`.

