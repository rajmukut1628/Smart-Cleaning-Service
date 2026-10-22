# Audit repairs — 22 October 2026

Implemented all confirmed audit repairs in local source:
- Private review DTOs and booking relationship checks.
- Authoritative block/unblock with session revocation; bulk-delete route ordering and ID validation.
- Password changes revoke old sessions; staff email changes require current password and a single-use emailed code, retaining canonical owner identity.
- Future Bangladesh schedule validation, transactional bulk lifecycle rules/timestamps, availability and hours checks.
- Service zero/clear semantics and numeric bounds; immutable new-booking billing snapshots with legacy fallback.
- Reciprocal chat contact policy/unread counts; production seed guard; login throttling and debug-payload log removal.
- Dependency upgrades and frontend lint/type cleanup.

Also implemented cancellation requests with staff approval, private booking-linked support tickets, direct PDF receipts with a Bengali-capable font, owner provider diagnostics, optional encrypted scheduled backup and external monitoring workflow.

Validation: 129 backend tests passed; frontend ESLint and production build passed; npm audit including development dependencies returned zero advisories for both packages. The real HTTP/MongoDB journey and restore drill passed, including the added security/availability/provider-flow checks (email transport intercepted). See VERIFICATION_REPORT.md. Registration layout was visually checked at 1280×720 after the Tailwind migration; exhaustive device/browser coverage is not claimed.

Deployment still required. Configure optional automation using AUTOMATION_SETUP.md. Real hosted Google OAuth, mail delivery and Cloudinary asset upload were not exercised. The frontend build retains a nonblocking large-chunk warning. Old bookings cannot reconstruct historical values that were never stored. Availability changes protect new assignments; existing schedules require administrator review. Login throttling is per process; distributed deployments should use a shared rate-limit store.

The original PROJECT_AUDIT.md and AUDIT_PROBES files are historical baseline evidence, not the post-fix result. No live database/account was modified and no GitHub push was performed.
