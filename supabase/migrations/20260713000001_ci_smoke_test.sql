-- Runway — CI pipeline verification. No-op (comment only): this migration
-- confirmed the GitHub Actions "Deploy Supabase" workflow applies new
-- migrations automatically on push, after the one-time baseline repair.
-- Kept in history rather than deleted, per migration-file convention: once
-- applied to a real environment, a migration file stays (even a harmless
-- one) so the recorded history matches what actually happened.
select 1;
