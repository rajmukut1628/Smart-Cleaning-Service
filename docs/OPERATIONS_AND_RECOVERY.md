# Operations and recovery

## Booking lifecycle
- Customer creates a booking. Only that customer, its assigned team and administrators can read its timeline.
- Assigning a team checks time intervals (Bangladesh time and service duration), not just matching start times. Database leases serialize assignment and reschedule decisions for the same booking/team across server instances. Active leases expire after two minutes if a process stops.
- Only the booking customer can request a different future schedule before work starts. A pending request does not modify the current schedule. Admin approval checks conflicts again and uses a conditional update; a changed/started booking must be refreshed. Rejections preserve the schedule.
- Workers update their assigned job through confirmed → in-progress → completed. Work completion and payment confirmation remain separate.
- Cash receipt download is restricted to the booking customer and administrators after completed + paid. Download the server-generated PDF directly; Bengali text uses the bundled licensed font. Reversing payment invalidates previously downloaded receipts.
- Timeline records new changes with actual timestamps and actor names. Historical records show only dates that were genuinely stored. Unknown past assignments are not fabricated.

## Owner operations
Open Settings as the canonical platform owner. Owner operations provides:
- encrypted logical database snapshots;
- the latest 30 server/render errors (30-day database retention);
- paginated activity logs and role filters.

Snapshots use AES-256-GCM and a key derived from the supplied passphrase using scrypt. The passphrase is not saved. The archive includes password hashes and private chat/contact data; keep it private and keep its passphrase separately. Limit: 25 MB per archive, five minutes between exports. Pending verification/reset tokens, notification-read records and transient locks/error logs are excluded. These are not a replacement for MongoDB point-in-time backups. A logical export reads collections sequentially: take it during a quiet maintenance period. For larger databases use MongoDB Database Tools/provider backups.

Images are external Cloudinary assets; the snapshot preserves URLs, not the image files. Retain the Cloudinary account/assets and configure the destination environment separately. Environment variables, API secrets and uploaded local files are not included. Backups are downloaded to your computer; the Render ephemeral filesystem is not used for storage.

### Safe restore drill
Use a **new empty MongoDB database with transaction support** (for example an Atlas staging database). Never test a restore against the running database. Install backend dependencies and build first.

Set these environment variables in your terminal without committing them:
- `RESTORE_MONGO_URI`: URI for the empty target database.
- `BACKUP_PASSPHRASE`: the passphrase used for this archive.

From the backend directory, validate without writing:

```powershell
node dist/scripts/restoreBackup.js "C:\Backups\smart-cleaning.scsbackup"
```

Only after checking the empty destination, apply:

```powershell
node dist/scripts/restoreBackup.js "C:\Backups\smart-cleaning.scsbackup" --apply
```

The restore refuses nonempty application collections and writes within a MongoDB transaction. Existing data is never overwritten. Session versions are advanced so archived sessions cannot be reused. Start the app against the restored database to build indexes, then verify owner login, customer isolation, assignments, receipts, chat and Cloudinary URLs. Remove the restore environment variables afterward. This task does not change the live database or configure provider backups automatically. Download backups after important changes and regularly test restoration.

## Error monitoring
Server responses include an `X-Request-ID`. Failed server requests record method, sanitized route, status and reference ID. React rendering failures report a fixed category. Request bodies, passwords, tokens, query strings, user-entered messages and stack traces are not stored in this log. Owner access is enforced in backend middleware. This records application errors while the backend/database are reachable; it is not external uptime monitoring. The opt-in GitHub workflow now supports external checks and encrypted daily backups; configure it using AUTOMATION_SETUP.md.

## Deploy
Push changes and deploy both frontend and backend. Existing product features use the configured providers; optional automation needs the configuration in AUTOMATION_SETUP.md. Owner operations appears under Settings. Do not run restore commands as the production Start Command. Existing normal Start Command remains `npm run start:prod`.

## Repeat the local verification drill

Run `npm run verify:journey --prefix backend` to exercise real HTTP routes with synthetic accounts and an isolated local MongoDB replica set. It uses the installed cached MongoDB 7 executable by default; set `MONGOD_BINARY` to your installed executable if needed. It does not read the project's MongoDB URI and does not contact the hosted application. Both disposable databases and their encrypted archive are removed after shutdown. The results are written to `docs/VERIFICATION_REPORT.md` and `docs/VERIFICATION_REPORT.json`. This checks account isolation, booking pricing, assignments, overlap prevention, reschedule approval, worker status, cash confirmation/reversal, revenue, earnings, receipts, notifications, chat, encrypted backup and restoration to an empty database.
