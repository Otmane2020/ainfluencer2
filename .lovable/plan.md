
# Fix Plan: Video Quality Display and Social Media Publishing

## Problem Summary

Two distinct issues need to be resolved:

1. **Video Quality Perception**: Users see quality options (720p, 1080p, 4K) but all videos generate at 720p due to provider limitations. This creates a misleading UX.

2. **Social Media Not Posting**: The "Publish" button generates content and updates database status but never actually calls the Meta API to post to Facebook/Instagram.

---

## Solution Overview

```text
+------------------+      +-------------------+      +------------------+
|  ScheduledPost   | ---> | handlePublishNow  | ---> |   shareToMeta    |
|     Modal        |      | (CalendarPage)    |      | (Meta OAuth API) |
+------------------+      +-------------------+      +------------------+
                                  |
                                  v
                          +---------------+
                          | Update Status |
                          |  "published"  |
                          +---------------+
```

---

## Technical Changes

### 1. Fix Social Media Publishing Flow

**File: `src/pages/CalendarPage.tsx`**

- Import `useMetaOAuth` hook
- Update `handlePublishNow` to:
  - Check if Meta is connected
  - Call `shareToMeta` for each selected platform (Facebook, Instagram)
  - Wait for video generation to complete before posting (if video content)
  - Update status to "published" only after successful API calls
  - Handle errors gracefully with user feedback

### 2. Clarify Video Quality in UI

**File: `src/components/VideoGenerator.tsx`**

- Update quality selector to show honest descriptions:
  - Remove misleading 1080p/4K labels
  - Or add a note: "All videos currently render at 720p (provider limitation)"
- Consider removing quality selector entirely if it has no effect

### 3. Add Publishing Indicators

**File: `src/components/ScheduledPostModal.tsx`**

- Add visual feedback during Meta API calls
- Show which platforms were successfully posted
- Display actual post URLs/IDs after successful publishing

---

## Detailed Implementation

### CalendarPage.tsx Changes

```typescript
// Add hook import
import { useMetaOAuth } from "@/hooks/useMetaOAuth";

// In component
const { isConnected, shareToMeta, connection } = useMetaOAuth();

// Updated handlePublishNow
const handlePublishNow = async (post: ScheduledPost) => {
  // 1. Check Meta connection
  if (!isConnected) {
    toast({ title: "Error", description: "Connect to Meta first", variant: "destructive" });
    return;
  }

  // 2. Validate media_url exists for video posts
  if (post.content_type === "video" && !post.media_url) {
    toast({ title: "Error", description: "Video not ready yet", variant: "destructive" });
    return;
  }

  // 3. Post to each selected platform
  const platforms = post.platforms || [];
  const results = [];
  
  for (const platform of platforms) {
    if (platform === "facebook" || platform === "instagram") {
      const result = await shareToMeta(
        platform,
        post.text_content || "",
        post.media_url || undefined
      );
      results.push({ platform, success: result.success });
    }
  }

  // 4. Update database based on results
  const allSuccess = results.every(r => r.success);
  await supabase
    .from("scheduled_posts")
    .update({
      status: allSuccess ? "published" : "failed",
      published_at: allSuccess ? new Date().toISOString() : null,
    })
    .eq("id", post.id);

  // 5. Show feedback
  toast({
    title: allSuccess ? "Published!" : "Partial failure",
    description: allSuccess 
      ? "Posted to all platforms" 
      : "Some platforms failed",
  });
  
  fetchPosts();
};
```

### VideoGenerator.tsx Quality Transparency

```typescript
const QUALITY_OPTIONS = [
  { 
    value: "720p", 
    label: "HD 720p", 
    description: "Current maximum quality" 
  },
];
// Remove 1080p and 4K options OR
// Add note: "Higher resolutions coming soon"
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/CalendarPage.tsx` | Add Meta OAuth hook, implement actual social posting |
| `src/components/VideoGenerator.tsx` | Update quality options with honest labeling |
| `src/components/ScheduledPostModal.tsx` | Add publishing status indicators |

---

## Edge Cases Handled

1. **Video not ready**: If video generation is still in progress, show "Video generating..." and disable publish
2. **No Meta connection**: Show clear error message directing user to Integrations page
3. **Partial platform failure**: Update status appropriately, log which platforms failed
4. **No media_url for video posts**: Block publishing until video is available

---

## Testing Checklist

- [ ] Publish a video post - verify it appears on Facebook Page
- [ ] Publish a video post - verify it appears on Instagram Reels
- [ ] Verify quality selector shows accurate information
- [ ] Verify failed posts show correct error messages
- [ ] Verify published_at timestamp is set after successful publish
