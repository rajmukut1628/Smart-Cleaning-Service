# Custom requests and work-photo requirements

## Worker evidence
- At least one storage-verified before image is required before confirmed → in-progress.
- At least one before image and one after image are required before in-progress → completed.
- Both worker status APIs and administrator bulk transitions enforce these requirements.
- After photos can be saved only while work is in progress. Completed/cancelled job photos cannot be overwritten. A running job cannot clear its last before photo.
- Existing in-progress jobs may add missing before photos so legacy work can be completed. Historical completed jobs are not reopened or changed.
- Completion remains separate from cash confirmation. No automatic payment or revenue update was added.

Local evidence must exist as a nonempty file; Cloudinary evidence must return a successful image response from the configured cloud. Missing/unreachable evidence blocks start/completion and asks the worker to retry or re-upload. Both image attachment endpoints also verify storage.

## Custom cleaning requests
Customer Services → Custom cleaning requests → New request. Customers submit requirements, address, preferred Bangladesh schedule and optional images. Customers do not set service prices or duration.

Admin/Superadmin Dashboard → Custom requests, or Management → Custom requests. Staff reviews customer contact/requirements and issues a fixed total quote with duration and scope notes. Staff may revise an open quote or decline the request.

Customers receive quote/rejection updates in their own notification inbox, with read receipts and a link to the exact request (including older paginated requests). Revised quotes receive a new unread identity.

The customer reviews the quote, selects a future schedule and accepts to book, or declines. Acceptance creates one private service and one pending, unpaid booking within a MongoDB transaction. Staff then assigns workers through the normal booking workspace. Request versions prevent stale quote acceptance; concurrent/repeated acceptance does not duplicate bookings. Private quoted services cannot be booked again through ordinary customer/admin booking endpoints.

Requests are visible only to their customer and administrators; workers cannot access request/quote APIs. Workers only receive their eventual assigned booking. The former private-service creation/edit/delete APIs are disabled and the old customer pricing form is no longer mounted. Existing service/booking documents are retained; new requests are included in encrypted backups with backward-compatible restore support.

## Deploy and verification
Deploy BOTH backend and frontend, preferably backend first. No new provider credentials are needed. No production accounts/data were migrated or edited by this change. Refresh the browser after deployment.

In dev:live mode the local UI uses the deployed backend, so new request endpoints and photo enforcement do not take effect there until the backend deployment is complete. A frontend-only deployment cannot enforce backend photo rules.

Backend regression suite: 133 passing tests. The expanded disposable MongoDB journey tests photo gating, private request access, staff-only quoting, stale/tampered quote rejection, concurrent single-booking acceptance, payments and encrypted backup/restore. See VERIFICATION_REPORT.md for the latest run. Actual hosted uploads/email delivery are not established by this isolated drill.

## Dashboard corrections
Pending filters match the raw pending booking state. Calendar events share dashboard refresh data and open the existing booking overview; standalone calendars also refresh periodically.
