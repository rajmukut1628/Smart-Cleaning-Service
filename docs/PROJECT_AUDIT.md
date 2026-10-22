# Project audit — 22 October 2026

> Historical findings below describe the pre-repair baseline. Repairs and final checks are recorded in AUDIT_RESOLUTION.md.

Scope: current local application code, real HTTP/database probes in a disposable MongoDB replica set, frontend production build, frontend ESLint, backend regression tests, and npm production dependency audit. No production application code, live accounts, hosted database or dependencies were changed for this audit. Additional diagnostic scripts and reports were created.

## Verified baseline

- Frontend production build: passed.
- Backend regression suite: 123 passed, 0 failed.
- Main booking/recovery drill: passed previously and again as part of the audit probes.
- ESLint: failed — 52 errors, 7 warnings (mostly explicit `any`, unused variables and hook dependencies).
- npm audit, production dependencies only: backend 11 affected package entries (1 critical, 7 high, 3 moderate); frontend 12 (9 high, 3 moderate). These are advisory matches, not proof every advisory is exploitable through this application. Some packages appear in both trees. npm reported fixes available; no automatic fixes were applied.

## Confirmed defects — reproduced with real local data

### P1 — Review endpoints expose private email addresses

`backend/src/controllers/reviewController.ts:84` and `:127`; `backend/src/routes/reviewRoutes.ts`.

Unauthenticated GET `/api/reviews/worker/:workerId` includes the reviewing customer's email. An unrelated authenticated customer can GET `/api/reviews/booking/:bookingId` and obtain both customer and worker emails. The booking-review endpoint requires sign-in but never verifies a relationship to the booking.

Fix: use a safe public review DTO without email/contact details. Restrict private booking-review lookup to the booking customer, assigned team and administrators.

### P1 — Bulk block does not actually block an account

`backend/src/controllers/adminController.ts:429`; `backend/src/middleware/authMiddleware.ts:26`.

Bulk block writes `isBlocked`, which is not a User schema field. Login/protected requests check `role === 'blocked'`. A block request returns success while the targeted customer can still sign in. The model may update timestamps and report a modification while discarding the unknown field.

Fix: use one authoritative block state throughout login, sockets and role permissions; preserve the original worker/customer role for unblocking; revoke existing sessions and sockets.

### P1 — Profile API bypasses email verification

`backend/src/controllers/profileController.ts:25`.

Customer profile UI treats email as read-only, but authenticated PUT `/api/profile` accepts a replacement email immediately. The new address does not need a verification code. This bypasses the signup email ownership guarantee. Backend normalization and email validation are also missing on this path.

Fix: disallow direct customer email replacement or implement a verified email-change challenge, keeping the old email until verification. Preserve intentional owner-email editing with appropriate reauthentication/verification.

### P2 — Bulk delete always hits the wrong route

`backend/src/routes/adminRoutes.ts:47` precedes `:58`.

DELETE `/api/admin/users/bulk-delete` matches `/users/:id` first. The single-user handler treats `bulk-delete` as an ObjectId and returns HTTP 500. The actual bulk handler is never reached.

Fix: register specific bulk routes before parameterized routes and validate all IDs before database access.

### P2 — Password change leaves old sessions valid

`backend/src/controllers/profileController.ts:148`.

After a successful profile password change, a JWT issued before the change still accesses `/api/profile`. The path does not increment `sessionVersion` or disconnect authenticated sockets. Forgot-password reset already performs revocation, so the two flows are inconsistent.

Fix: revoke previous sessions and sockets consistently, then issue a fresh session or require sign-in.

### P2 — Booking creation accepts past dates

`backend/src/controllers/bookingController.ts:48`.

Customer POST `/api/bookings` accepts a validly formatted date in the year 2000 and creates a pending booking. Date validation checks parsability, not whether the scheduled time is in the future. Admin creation has the same validation pattern.

Fix: validate date/time in Bangladesh time in backend creation paths, with any deliberate admin backdating handled explicitly.

### P2 — Bulk status changes bypass the booking lifecycle

`backend/src/controllers/adminController.ts:321`; `backend/src/models/Booking.ts:56`.

A pending/unassigned booking can be marked completed directly through bulk update. `completedAt` remains unset because the completion timestamp is only written by the document save hook; `updateMany` does not run that hook. Bulk update/cancel can also move completed, paid bookings backward or cancel them without a refund/reversal policy. These changes alter the completed+paid revenue selection.

Fix: enforce allowed transitions in every path, protect paid/completed records, and set/preserve first completion timestamps in atomic bulk operations.

### P2 — Chat sender and recipient permissions disagree

`backend/src/controllers/chatController.ts:10`, `:38`, `:63`.

An ordinary admin can send a message to a worker. The worker's contact policy excludes ordinary admins, so the worker cannot open that conversation (403) or reply. The unread endpoint still counts the inaccessible message.

Fix: make allowed conversations mutually readable according to the chosen role policy, and scope unread counts to accessible conversations. Under the user's existing policy, ordinary admins should be prevented from initiating those worker conversations unless policy is deliberately changed.

## Further code findings — not destructive probes

### P1/P2 — Production dependency security updates needed

npm audit flags backend dependencies including mongoose, multer, engine.io, jws, proxy-addr, socket.io-parser and ws; frontend dependencies include axios, react-router-dom/router and transitive dependencies. Fix availability was reported. Assess advisory relevance and update compatible patched versions, then rerun regression, journey and restore drills. Do not assume an advisory count equals an application exploit count.

Example primary advisories returned by npm:
- https://github.com/advisories/GHSA-jqcg-44mw-7w3h
- https://github.com/advisories/GHSA-wpg9-53fq-2r8h
- https://github.com/advisories/GHSA-5528-5vmv-3xc2
- https://github.com/advisories/GHSA-2w69-qvjg-hvjx

### P2 — Login has no dedicated brute-force limiter

`backend/src/routes/authRoutes.ts:13`.

Registration/forgot-password have an IP limiter, but password login and Google sign-in do not use a dedicated limiter. Add bounded per-account/IP controls with appropriate proxy handling and avoid permanent account lockout denial-of-service.

### P2 — Service edit silently ignores valid clearing/zero values

`backend/src/controllers/serviceController.ts:55`.

Expressions such as `basePrice || oldValue`, `unitConfig || oldValue` and `image || oldValue` prevent setting a base price to zero or clearing linked configuration/image. Numeric schema fields also lack minimum bounds for ordinary admin service creation.

Fix: distinguish omitted properties from explicit zero/null/empty values, validate numbers, and apply a defined service pricing mode.

### P2 — Service history is not an immutable snapshot

`backend/src/models/Booking.ts`; `backend/src/controllers/bookingExperienceController.ts`.

Bookings store total/quantity/unit type but reference the live service/customer documents. Old receipts read the current service/customer names. Renaming/removing a service can change or remove historical receipt descriptions. Base/rate breakdown at booking time is not stored.

Fix: store the service/customer billing snapshot and price breakdown when creating the booking, with an explicit legacy fallback.

### P2 — Worker availability is not enforced during assignment

`backend/src/services/scheduling.ts`; `backend/src/controllers/adminController.ts`.

Interval overlap is checked, but saved weekday working hours/availability are not consulted when assigning a worker or approving a schedule change. This is separate from overlapping jobs.

Fix: validate worker working hours or clearly define availability as informational only.

### P2 — Development seed route can erase service catalog in production

`backend/src/routes/serviceRoutes.ts`; `backend/src/controllers/serviceController.ts:100`.

The route is admin protected, but has no production environment guard and deletes all service documents before seeding. Existing bookings continue referencing removed services. This was identified statically; the destructive endpoint was not executed.

Fix: disable in production and use a one-time, non-destructive development seed command.

### P3 — Debug logging and lint cleanup

`backend/src/controllers/reviewController.ts:10` logs request bodies and the authenticated user object. Remove production debug payload logging. Fix lint findings with real types and correct hook dependencies instead of blanket rule disabling. Old unused components should be reviewed separately; a file's presence does not mean the active UI uses it.

## Remaining features and operational limits — not claimed as existing bugs

- Customer cancellation-request approval and structured complaint/support tickets are not implemented. Admin bulk cancellation and support chat exist. These were suggestions, not part of the selected journey/restore work.
- Receipt download is HTML with browser Print / Save as PDF, not a direct server-generated PDF file.
- Encrypted database backup is manual, limited to 25 MB; automatic scheduled/offsite backups are not configured. Cloudinary image binaries are outside the database archive; URLs are preserved.
- Error monitoring records application/server errors, but does not provide an external uptime check or email/SMS alerts.
- Real hosted Google OAuth, email delivery, Cloudinary asset delivery and Render environment settings were not revalidated in this audit. Existing local API tests do not establish those production settings are correct.
- Browser/device coverage is not exhaustive: prior responsive checks cover booking cards/modals, not every phone/browser/accessibility scenario.

## Suggested repair order

1. Review privacy, authoritative blocking, verified email change, and compatible dependency security updates.
2. Bulk route ordering, status transitions/timestamps, password session revocation, future-date validation and mutually accessible chat.
3. Service update semantics/history snapshots, availability rules, production seed guard and login throttling.
4. Lint/log cleanup and hosted integration/mobile verification.
5. Optional product features and automatic operational services.

Evidence: `docs/AUDIT_PROBES.json` and `docs/AUDIT_PROBES.md`. In those diagnostic reports, a probe passing means the expected behavior/defect was reproduced; it does not mean the application is free of defects. The isolated fixture databases and archive were removed after the probes. No application fixes or package upgrades were applied during this audit.
