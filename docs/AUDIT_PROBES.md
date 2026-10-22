# Audit diagnostic probes

Run: 2026-10-22T09:28:26.649Z

Probe execution: **PASSED**. Known defects were reproduced; this is not a clean project audit.

- PASS: Real password sign-in for customer, worker, admin and canonical owner
- PASS: Customer booking uses saved pricing and enforces customer/staff isolation
- PASS: Assigned worker sees the booking; overlapping assignment and admin creation are blocked
- PASS: Reschedule preserves the old time until admin approval and notifies the correct customer/team
- PASS: Only the assigned worker completes work; unpaid completed work contributes zero revenue
- PASS: Cash confirmation updates receipt, earnings and revenue exactly once; notification reads persist
- PASS: Payment reversal removes revenue and invalidates receipts; timeline records actors and chat persists
- PASS: CONFIRMED BUG: bulk block reports success but leaves customer able to sign in
- PASS: CONFIRMED BUG: bulk-delete endpoint is shadowed by the single-user DELETE route
- PASS: CONFIRMED BUG: public worker reviews and unrelated customer booking-review lookup expose email addresses
- PASS: CONFIRMED GAP: changing profile password does not revoke already issued login tokens
- PASS: CONFIRMED BUG: profile API changes customer email without verifying the new address
- PASS: CONFIRMED BUG: customer booking API accepts a past service date
- PASS: CONFIRMED BUG: bulk status changes bypass lifecycle and leave completedAt unset
- PASS: CONFIRMED BUG: ordinary admin can send a worker a message the worker cannot open or reply to
- PASS: Only canonical owner downloads encrypted backup containing actual test database records
- PASS: Wrong passphrase is rejected; dry-run validation writes no records
- PASS: Transactional restore matches every exported record; BSON IDs/dates, password hashes, timelines and image URLs survive
- PASS: Restore refuses a nonempty target and does not overwrite existing records
- PASS: Restored accounts sign in with original credentials; owner authority, receipt, revenue, jobs and chat work
- PASS: Archived login tokens are revoked after restore; owner-only operations remain protected

## Restored snapshot counts

- users: 6
- bookings: 2
- services: 1
- unitconfigs: 1
- reviews: 1
- messages: 1
- platformownerships: 1
- activitylogs: 13

- Real HTTP routes, authentication, Mongoose queries and MongoDB transactions were used; no model mocks.
- No live account, hosted API, production database or real email was used.
- Cloudinary URL preservation was verified; external image delivery was not contacted.
- Browser UI checks are separate from this API/database drill.
- Temporary MongoDB files and encrypted test archive are removed after shutdown.
