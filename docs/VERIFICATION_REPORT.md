# Booking and recovery verification

Run: 2026-10-22T10:10:42.935Z

Result: **PASSED**

- PASS: Real password sign-in for customer, worker, admin and canonical owner
- PASS: Customer booking uses saved pricing and enforces customer/staff isolation
- PASS: Assigned worker sees the booking; overlapping assignment and admin creation are blocked
- PASS: Reschedule preserves the old time until admin approval and notifies the correct customer/team
- PASS: Only the assigned worker completes work; unpaid completed work contributes zero revenue
- PASS: Cash confirmation updates receipt, earnings and revenue exactly once; notification reads persist
- PASS: Payment reversal removes revenue and invalidates receipts; timeline records actors and chat persists
- PASS: Audit fixes: block/unblock restores worker role, bulk delete works, verified email cannot be bypassed and password changes revoke sessions
- PASS: Worker working hours are enforced during new admin assignments
- PASS: Audit fixes: review emails are private; past dates, lifecycle bypass and inaccessible admin-to-worker messages are rejected
- PASS: Audit fixes: zero/clear service edits work; historical price/name snapshots survive edits and receipts download as real PDFs
- PASS: Cancellation requires admin approval; support tickets isolate customers and support administrator replies/status
- PASS: Owner email change requires password plus a single-use code, preserves ownership and revokes old sessions (email transport intercepted)
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
- activitylogs: 20
- supporttickets: 1

- Real HTTP routes, authentication, Mongoose queries and MongoDB transactions were used; no model mocks.
- No live account, hosted API, production database or real email was used. The email-change transport alone was intercepted for OTP verification.
- Cloudinary URL preservation was verified; external image delivery was not contacted.
- Browser UI checks are separate from this API/database drill.
- Temporary MongoDB files and encrypted test archive are removed after shutdown.
