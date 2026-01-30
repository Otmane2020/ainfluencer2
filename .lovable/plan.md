

# Fix Facebook OAuth Popup Auto-Close Issue

## Problem Analysis

The Facebook (Meta) OAuth popup should automatically close after successful authentication, but it doesn't close reliably. After reviewing the code, I found the following issues:

1. **Timing inconsistency**: Meta OAuth uses a 500ms delay before closing, while YouTube and LinkedIn use 2000ms. The 500ms might be too fast for the message to be processed.

2. **HTML structure differences**: Meta OAuth has a more complex try-catch block that might silently fail.

3. **Error cases close immediately**: Error HTML pages call `window.close()` without any delay, which might prevent the error message from being displayed or sent.

## Solution

Update the Meta OAuth callback HTML to match the pattern used successfully in YouTube and LinkedIn OAuth:

1. Increase the timeout to 2000ms for consistency
2. Simplify the callback HTML structure
3. Add proper error handling with styled pages like YouTube/LinkedIn
4. Ensure `window.close()` is called in all cases with appropriate delays

## Technical Changes

### File: `supabase/functions/meta-oauth/index.ts`

**Error cases (lines 106-111, 116-121, 134-139)**:
Replace inline HTML with styled error pages that include:
- Visual feedback (error icon)
- Error message display
- 2000ms delay before close

**Success case (lines 240-266)**:
Update the callback script to:
- Use consistent 2000ms timeout like YouTube/LinkedIn
- Simplify the try-catch block

```text
Before (error case):
+------------------------------------------+
| window.close()  <- immediate, no delay   |
+------------------------------------------+

After (error case):
+------------------------------------------+
| setTimeout(() => window.close(), 2000)   |
| + styled error page with message         |
+------------------------------------------+
```

```text
Before (success case):
+------------------------------------------+
| setTimeout(() => window.close(), 500)    |
+------------------------------------------+

After (success case):
+------------------------------------------+
| setTimeout(() => window.close(), 2000)   |
+------------------------------------------+
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/meta-oauth/index.ts` | Update callback HTML with consistent styling and 2000ms timeouts |

## Testing

After implementation:
1. Go to Integrations page
2. Click "Connect" on Facebook/Instagram
3. Complete the OAuth flow
4. Verify the popup shows success/error message briefly
5. Verify the popup closes automatically after ~2 seconds

