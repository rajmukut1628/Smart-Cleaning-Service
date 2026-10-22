# Platform ownership

The designated initial owner is `platformauthority@gmail.com`. Ownership is stored in one `PlatformOwnership` document, not inferred from arbitrary `superadmin` role values. Only the stored owner can create/update administrators, change account roles, remove admin access, or transfer ownership.

## Initial setup

The backend initializes ownership at startup after connecting to MongoDB. If `platformauthority@gmail.com` already has an active password account, it becomes the initial owner. Its existing password is preserved. Other legacy superadmins become ordinary administrators and their old sessions are revoked.

If the designated account does not exist in a different database, configure these backend environment variables before startup:

```env
OWNER_EMAIL=platformauthority@gmail.com
OWNER_NAME=Platform Authority
OWNER_PHONE=your-phone-number
OWNER_PASSWORD=your-strong-password-at-least-12-characters
```

Never put owner credentials in frontend environment variables or Git. `OWNER_PASSWORD` creates a missing account; it never resets an existing account's password. Google-only and blocked accounts cannot become the bootstrap owner.

For a manual one-time setup, from `backend` run:

```sh
npm run build
node dist/scripts/createAdmin.js
```

Once a platform owner exists, startup and this script preserve the stored owner. Changing `OWNER_EMAIL` or rerunning setup does not reclaim ownership after transfer. The setup script no longer promotes arbitrary `ADMIN_EMAIL` values into additional superadmins.

## UI

Sign in with the owner account's existing password. Open **Management → Ownership & access**.

- The owner card displays the current authoritative owner.
- **Add Admin** creates an ordinary administrator. Google customer accounts are not eligible for staff access.
- **Transfer ownership** lets the current owner select an existing password-based administrator. The owner types that person's email and their own current password to confirm. The selected admin becomes the sole owner; the previous owner becomes an ordinary admin. All staff must sign in again after a transfer.
- **Remove administrator access** requires the same email/password confirmation. It removes staff rights and revokes that account's prior sessions. The customer account and its records remain. The current owner cannot remove themselves.
- **Access history** shows the latest 20 recorded ownership/access events (the authority document retains the latest 100).

The People role dropdown, generic admin updates, and bulk block/delete endpoints cannot grant additional ownership or remove the current owner. Authority changes use a revision check so stale or simultaneous confirmations do not overwrite one another. Removing an administrator also records revocation in the authority document, so permissions remain revoked even if a display-role update has to be retried.

The feature is database-specific: local MongoDB and the deployed Atlas database have their own ownership records. Deploy the updated backend and frontend to use these controls on the live site.

## Requested owner replacement: rajmukut66@gmail.com

A scoped, explicit maintenance command is available at `src/scripts/setupRequestedOwner.ts`. It creates or updates the requested password account and transfers ownership only from `platformauthority@gmail.com`, or initializes ownership if no owner record exists. The former owner remains an ordinary administrator. Changes commit in a MongoDB transaction; existing staff sessions become invalid. Re-running after the target is already Owner does not reset its password again.

The local `.env.live` file is ignored by Git. It can contain the live `MONGO_URI` and the following values. Do not commit passwords or connection strings:

```env
OWNER_SETUP_EMAIL=rajmukut66@gmail.com
OWNER_SETUP_PASSWORD=<the-password-specified-by-the-user>
OWNER_SETUP_PHONE=<the-phone-specified-by-the-user>
```

Run locally from backend with `npm run build` followed by `node dist/scripts/setupRequestedOwner.js` when Atlas network access works.

If local TLS access fails but the existing Render backend can access Atlas, push the maintenance script and its helper first. In Render backend Environment set the three OWNER_SETUP variables above, leaving the existing MONGO_URI intact. Temporarily set the backend Start Command to:

```sh
node dist/scripts/setupRequestedOwner.js && node dist/server.js
```

Deploy the latest commit. Successful setup logs only the status and target email, never the password. Sign in with the new owner's email and the specified password. Restore `npm run start:prod` as the Start Command and remove the three OWNER_SETUP variables afterward. Existing bootstrap OWNER_EMAIL values do not reclaim ownership on subsequent restarts.

If the current Owner is a different account, or the target is blocked or Google-only, the command refuses the change for manual review. Automated tests use mock accounts and do not demonstrate a completed live migration.
