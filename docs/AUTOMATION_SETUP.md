# Enable hosted operations after deployment

No hosted secrets or schedules were activated by this change. Configure only ONE of your two GitHub repositories to avoid duplicate alerts/backups.

1. Push and deploy both apps. Use Node 22.12 or newer (below 27), preferably Node 24. Backend Start Command stays npm run start:prod; do not run migration/restore as the start command.
2. Generate a random key locally: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))". Store it privately as OPERATIONS_AUTOMATION_KEY in Render BACKEND Environment, then save/deploy. Never put it in frontend VITE variables.
3. GitHub repository Settings → Secrets and variables → Actions: add repository SECRETS OPERATIONS_AUTOMATION_KEY (same value), BACKUP_PASSPHRASE (12–200 characters, strong and stored separately), BREVO_API_KEY, MAIL_FROM_EMAIL (verified sender), ALERT_EMAIL (your destination).
4. Add repository VARIABLES APP_URL=https://smart-cleaning-service-1.onrender.com and API_URL=https://smart-cleaning-service.onrender.com. Add ENABLE_AUTOMATED_OPS=true when ready.
5. Actions → Scheduled backups and uptime checks → Run workflow. Enable its backup checkbox for the first test. Verify the job is green and download its encrypted artifact. Test restoration against an EMPTY staging database using OPERATIONS_AND_RECOVERY.md. Keep the passphrase separately; losing it makes the archive unusable.
6. The workflow requests checks every 30 minutes and backup at 03:00 UTC daily (09:00 Bangladesh). GitHub scheduled runs may be delayed/skipped; this is not guaranteed continuous monitoring. Alerts are sent only on failure-state changes and recovery. Confirm Actions is enabled and inspect failed-run notifications.

Encrypted artifacts retain for 30 days. Database export limit is 25 MB. Cloudinary image bytes are not included; preserve the Cloudinary account/assets. Backups contain personal data and password hashes; repository collaborators with Actions access may download encrypted artifacts. The automation key grants backup access only: rotate it in both Render and GitHub if exposed.

Owner Settings → Integration checks can check provider authentication and frontend/backend Google Client ID agreement. A real deployed Google login, email verification delivery and image upload still require a browser test with your configured account. No test email or image upload is sent by the check button.
