import nodemailer from 'nodemailer';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function verificationEmail(name: string, code: string) {
  const safeName = escapeHtml(name);
  return {
    subject: 'Verify your email • Smart Cleaning Service',
    text: `Smart Cleaning Service\n\nHi ${name},\n\nWelcome! Use this code to verify your email and complete your account registration:\n\n${code}\n\nThis code expires in 10 minutes. Enter it on the sign-up page you already have open. Verification signs you in automatically. Next time, sign in with your email and the password you chose.\n\nNever share this code. Our team will never ask for your password or verification code. If you did not request an account, ignore this email.\n\nThoughtful care. Beautiful spaces.\nSmart Cleaning Service`,
    html: `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f6ff;font-family:Arial,Helvetica,sans-serif;color:#183153;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your verification code expires in 10 minutes. Complete your Smart Cleaning Service registration.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f6ff;"><tr><td align="center" style="padding:32px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #dce7f9;border-radius:20px;overflow:hidden;background:#fff;"><tr><td style="padding:28px 30px;background:#153975;color:#fff;"><p style="margin:0 0 6px;font-size:19px;font-weight:bold;">✦ Smart Cleaning Service</p><p style="margin:0;color:#c4d9ff;font-size:12px;">Thoughtful care. Beautiful spaces.</p></td></tr><tr><td style="padding:30px;"><p style="margin:0 0 10px;color:#2563eb;font-size:10px;letter-spacing:2px;font-weight:bold;">ONE LAST STEP</p><h1 style="margin:0 0 18px;font-size:25px;line-height:1.3;color:#142c4f;">Verify your email.</h1><p style="margin:0 0 12px;font-size:14px;line-height:1.7;">Hi ${safeName},</p><p style="margin:0 0 22px;font-size:14px;line-height:1.7;color:#526984;">Welcome! Enter the code below on your sign-up page to confirm your email and finish creating your account.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:22px 10px;background:#eff5ff;border:1px solid #d9e6ff;border-radius:14px;"><p style="margin:0 0 10px;font-size:10px;letter-spacing:1.5px;color:#5d78a3;">YOUR VERIFICATION CODE</p><p style="margin:0;font-size:34px;font-weight:bold;letter-spacing:9px;color:#245ee6;">${code}</p><p style="margin:12px 0 0;font-size:11px;color:#6680a4;">Valid for 10 minutes · Use once</p></td></tr></table><p style="margin:22px 0 0;font-size:13px;line-height:1.7;color:#526984;">Verification signs you in automatically. Next time, use your email and the password you chose. Your account is ready only after verification.</p><div style="margin:22px 0 0;padding:14px 16px;border-left:3px solid #94b8fb;background:#f8faff;font-size:12px;line-height:1.7;color:#647997;"><strong style="color:#324f77;">Keep your account safe</strong><br>Never share this code. Our team will never ask for your password or verification code.</div><p style="margin:22px 0 0;font-size:11px;line-height:1.7;color:#8a9ab0;">Didn't request an account? You can safely ignore this message. No account will be created without verification.</p></td></tr><tr><td style="padding:18px 30px;border-top:1px solid #edf2fa;text-align:center;font-size:11px;color:#8a9ab0;">A cleaner space. A brighter day.<br><span style="display:inline-block;margin-top:6px;">Smart Cleaning Service</span></td></tr></table></td></tr></table></body></html>`,
  };
}

export async function sendVerificationEmail(email: string, name: string, code: string) {
  return sendTransactionalEmail(email, name, verificationEmail(name, code));
}

export async function sendTransactionalEmail(email: string, name: string, message: { subject: string; text: string; html: string }) {
  const fromEmail = process.env.MAIL_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim();
  const fromName = process.env.MAIL_FROM_NAME?.trim() || 'Smart Cleaning Service';
  if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) throw Object.assign(new Error('Verification email is not configured. Contact support.'), { status: 503 });
  if (process.env.EMAIL_PROVIDER === 'brevo') {
    if (!process.env.BREVO_API_KEY) throw Object.assign(new Error('Verification email is not configured. Contact support.'), { status: 503 });
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email, name }], subject: message.subject, htmlContent: message.html }),
      });
      if (!response.ok) throw new Error('Email provider rejected delivery');
      return;
    } catch { throw Object.assign(new Error('Could not send your verification email. Please try again.'), { status: 503 }); }
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw Object.assign(new Error('Verification email is not configured. Contact support.'), { status: 503 });
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, disableFileAccess: true, disableUrlAccess: true });
  try { await transport.sendMail({ from: { name: fromName, address: fromEmail }, to: email, ...message }); }
  catch { throw Object.assign(new Error('Could not send your verification email. Please try again.'), { status: 503 }); }
  finally { transport.close(); }
}
