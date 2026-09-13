# Beta Launch Checklist

The following checklist contains all technical and operational milestones verified prior to Beta deployment.

- [x] **Production build:** Verified HTML, CSS, JavaScript paths, removed localhost references.
- [x] **Environment variables:** Configured `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` securely in `.env.example`.
- [x] **Supabase configuration:** Core backend connected and verified.
- [x] **Auth configuration:** Supabase Auth is strictly managing session persistence via tokens, decoupled from insecure LocalStorage mechanisms.
- [x] **Email configuration:** Documented SMTP setup requirement in the Beta Deployment Report for when Email Confirmations are enabled. Currently skipped for frictionless onboarding.
- [x] **Storage:** Avatars and post media buckets are properly configured with MIME and file size constraints (50MB media, 2MB avatars).
- [x] **Realtime:** Channels configured to broadcast posts, messages, and notifications efficiently.
- [x] **RLS:** Policies verified and actively enforced on all mutations (Insert/Update/Delete).
- [x] **Security scan:** Conducted Regex search to verify zero hardcoded `JWT_SECRET` or `SERVICE_ROLE` keys exist in the frontend layer.
- [x] **Mobile QA:** Responsive layouts successfully adapt down to 320px viewport width via flexbox and CSS grids.
- [x] **Desktop QA:** UI spans successfully up to 2560x1440 resolutions without visual breakage.
- [x] **E2E QA:** Core user flows (Signup -> Profile -> Feed -> Post) validated during prior sweeps.
- [x] **Error handling:** Raw error messages abstracted in `app.js` to ensure users receive friendly, actionable UI prompts.
- [x] **Performance:** Heavy queries (like feed fetching) are bounded by `.limit()` methods.
## Vercel Deployment Actions
- [x] **Deployment:** [PASS] Successfully deployed to Vercel at `https://connect-sphere-beige.vercel.app`
- [x] **Vercel Build Settings:** [PASS] Correctly configured with cleanUrls removed from `vercel.json` to prevent 308 redirect loops.
- [x] **Environment Variables:** [PASS] Confirmed.
- [x] **Supabase Auth URL:** [PASS] Identified exact Redirect URLs: `https://connect-sphere-beige.vercel.app/pages/dashboard.html`.
- [x] **Live smoke test:** [PASS] Manual testing confirmed successful signup, login, dashboard loading, and post creation on the Vercel production domain.
