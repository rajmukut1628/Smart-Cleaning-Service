# Customer sign-up and verification email

Public customer authentication has two separate methods:

- **Email + password:** `/api/auth/register` sends a six-digit code. `/api/auth/register/verify` creates the account only after the code is confirmed. Successful verification signs the customer in automatically. Later logins use email and password.
- **Google:** `/api/auth/google/register` creates a Google-only account without establishing a session. Sign in afterward through `/api/auth/google`. This sign-in endpoint never creates or merges accounts.

Staff password login and existing customer password accounts remain usable. New Google authentication is customer-only. Pending registrations expire after 10 minutes; codes are hashed, single-use, limited to five attempts, and have a 60-second resend cooldown. No live accounts are needed to run the mocked backend regression suite.

## Local Gmail SMTP

Add to `backend/.env` without removing existing values:

```env
EMAIL_PROVIDER=smtp
MAIL_FROM_NAME=Smart Cleaning Service
MAIL_FROM_EMAIL=your-sender@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-google-app-password
```

Enable two-step verification on the sending Google account and generate an App Password. Use that app password in `SMTP_PASS`, not the normal Gmail password or the Google OAuth Client Secret. Restart the backend after changing its environment. Some managed Google accounts do not allow App Passwords; an HTTPS email provider can be used locally instead.

## Render Free: HTTPS delivery

Render Free blocks outbound SMTP on ports 25, 465 and 587. Use the integrated Brevo HTTPS transport instead:

1. Create a Brevo account, configure its sender/sending domain, and complete the provider's sender verification and transactional sending approval.
2. Generate a **Brevo API key**, not an SMTP key.
3. Add these values in **Render backend → Environment**:

```env
EMAIL_PROVIDER=brevo
MAIL_FROM_NAME=Smart Cleaning Service
MAIL_FROM_EMAIL=your-approved-sender@example.com
BREVO_API_KEY=your-brevo-api-key
```

4. Deploy the backend. Do not add SMTP credentials or the Brevo key to frontend variables or commit them to Git.
5. Sign up with a new customer email, receive the code, verify it, and confirm automatic sign-in. Then log out and sign in with the password. Confirm that unregistered Google sign-in is rejected, and register a different Google account through Google to exercise that separate flow.

The code does not claim email delivery until the provider accepts the request. Provider acceptance does not guarantee inbox placement; check Spam and the provider's delivery logs. Verification errors never return codes or passwords to clients. The signup screen is kept open for entering the code; no callback URL or SMTP settings are required in the frontend.

Preview: `docs/verification-email-preview.html` (sample name/code only).

Official references: [Render Free limitations](https://render.com/docs/free), [Nodemailer SMTP](https://nodemailer.com/smtp), [Brevo transactional API](https://developers.brevo.com/docs/send-a-transactional-email).
