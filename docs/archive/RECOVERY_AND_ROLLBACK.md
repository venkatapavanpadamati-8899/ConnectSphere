# ConnectSphere - Recovery & Rollback Plan

## Point-in-Time Recovery (PITR)
ConnectSphere relies on Supabase for database hosting. Production environments should enable Point-in-Time Recovery (PITR).
- PITR allows restoring the database to any exact second within the retention period (e.g., 7 or 30 days).
- In the event of catastrophic data corruption, use the Supabase Dashboard -> Database -> Backups to initiate a PITR restore.

## Migration Rollback
If a deployment fails or introduces regressions:
1. Identify the problematic migration version.
2. Use the Supabase CLI to rollback:
   ```bash
   supabase db reset
   # Or for specific environments, restore from backup, as Supabase does not natively support `migration down`.
   ```
3. Fix the migration file, commit to Git, and trigger the CI/CD pipeline again.

## Storage Backup
- User-uploaded media in Supabase Storage should be periodically synced to a secondary cold storage bucket (e.g., AWS S3 Glacier or Google Cloud Storage Archive) via a scheduled Edge Function or external chron job.
