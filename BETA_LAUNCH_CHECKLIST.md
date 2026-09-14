# Beta Launch Checklist

The following checklist contains all technical and operational milestones verified prior to Beta deployment.

- [x] **Production build:** Verified HTML, CSS, JavaScript paths, removed localhost references.
- [x] **Environment variables:** Configured `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` securely in `.env.example`.
- [x] **Supabase configuration:** Core backend connected and verified.
- [x] **Auth configuration:** Supabase Auth is strictly managing session persistence via tokens, decoupled from insecure LocalStorage mechanisms.
- [x] **Storage:** Avatars and post media buckets are properly configured with MIME and file size constraints (50MB media, 2MB avatars).
- [x] **Realtime:** Channels configured to broadcast posts, messages, and notifications efficiently.
- [x] **RLS:** Policies verified and actively enforced on all mutations (Insert/Update/Delete).
- [x] **Security scan:** Conducted Regex search to verify zero hardcoded `JWT_SECRET` or `SERVICE_ROLE` keys exist in the frontend layer.
- [x] **Mobile QA (11 Viewports):** Responsive layouts successfully adapt down to 320px viewport width up to 1920px without horizontal overflow.
- [x] **Desktop QA:** UI spans successfully up to 1920x1080 resolutions without visual breakage.
- [x] **Error handling:** Validated with live Supabase response (`400 invalid_credentials`).
- [x] **Performance:** Heavy queries (like feed fetching) are bounded by `.limit()` methods.

## Vercel Deployment Actions
- [x] **Deployment:** [PASS] Successfully deployed to Vercel at `https://connectsphere2.vercel.app`.
- [x] **Legacy Domain Redirect:** [PASS] `https://connect-sphere-beige.vercel.app` verified 307 redirect to `https://connectsphere2.vercel.app`.
- [x] **Vercel Rewrites:** [PASS] Correctly configured for all clean routes (`/login`, `/signup`, etc.) and `.html` routes in `frontend/vercel.json`.
- [x] **All 18 Production Routes:** [PASS] Verified HTTP 200 across all pages and friendly rewrites.
- [ ] **Supabase Auth URL:** [BLOCKED] Pending manual Supabase Dashboard verification for Site URL and Redirect URLs.
- [ ] **Live production signup:** [BLOCKED] Live signups encountering Supabase free-tier email rate limit (`HTTP 429 over_email_send_rate_limit`). Requires disabling "Confirm email" in Supabase Dashboard.
