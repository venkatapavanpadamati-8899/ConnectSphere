# Remaining Issues

| Issue | Root Cause | Required Action | External Configuration Required? | Test Required? |
|---|---|---|---|---|
| **Google OAuth Blocked** | The previous Client Secret was rotated for security, leaving the frontend unable to authenticate via Google. | Navigate to Supabase Dashboard > Authentication > Providers > Google, and paste the newly generated Client ID and Client Secret. | Yes | Yes (Test Login with Google) |
| **Storage Bucket Policies** | Code references buckets (`posts`, `story-media`, etc.), but actual Supabase RLS policies and bucket creation need manual verification in the Supabase Dashboard. | Verify existence of buckets and configure RLS policies for uploads/reads. | Yes | Yes (Test Uploading Media) |
| **Explore Backend Search** | Frontend search UI exists but full backend text search implementation is pending. | Implement Supabase text search RPCs or Edge Functions to serve explore feed. | No | Yes (Search functional test) |
