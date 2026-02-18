

## Fix LinkedIn Publishing - Version Update

### Problem
LinkedIn publishing fails with error: `"Requested version 20250201 is not active"`. The API version `202502` was recently sunset by LinkedIn.

### Solution
Update the `LinkedIn-Version` header from `202502` to `202602` (the current active version as of February 2026) in all three edge functions that publish to LinkedIn.

### Files to Update

1. **supabase/functions/run-campaigns-cron/index.ts** (line 790)
   - Change `"LinkedIn-Version": "202502"` to `"LinkedIn-Version": "202602"`

2. **supabase/functions/publish-image/index.ts** (line 277)
   - Change `"LinkedIn-Version": "202502"` to `"LinkedIn-Version": "202602"`

3. **supabase/functions/publish-clipmotion/index.ts** (line 625)
   - Change `"LinkedIn-Version": "202502"` to `"LinkedIn-Version": "202602"`

All three functions will be redeployed after the update. Then the LinkedIn post can be retried.

