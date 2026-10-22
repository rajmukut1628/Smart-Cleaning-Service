require('./helpers/ownership.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { createHash, createHmac } = require('crypto');
const User = require('../dist/models/User').default;
const Pending = require('../dist/models/PendingRegistration').default;
const mail = require('../dist/utils/verificationEmail');
const google = require('../dist/utils/googleIdToken');
const registration = require('../dist/controllers/registrationController');
const auth = require('../dist/controllers/authController');
process.env.JWT_SECRET = 'test-only-auth-flow-secret';
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const id = 'a'.repeat(64);
const hashId = createHash('sha256').update(id).digest('hex');
const hashCode = code => createHmac('sha256', process.env.JWT_SECRET).update(`${id}:${code}`).digest('hex');
const claims = { sub: 'verified-google-subject', email: 'customer@juicehour.com', name: 'Customer' };
function mock(object, key, value, restores) { const old = object[key]; object[key] = value; restores.push(() => { object[key] = old; }); }
async function withMocks(run) { const restores = []; try { await run((object, key, value) => mock(object, key, value, restores)); } finally { for (const restore of restores.reverse()) restore(); } }

test('manual signup accepts non-Gmail email, sends a code, stores only password/code hashes, and does not create an account or session', async () => withMocks(async mock => {
  let stored, delivered;
  mock(User, 'exists', async () => null);
  mock(User, 'create', async () => { throw Error('An account must not exist before verification'); });
  mock(Pending, 'findOne', async () => null);
  mock(Pending, 'findOneAndUpdate', async (_query, update) => { stored = update.$set; return stored; });
  mock(mail, 'sendVerificationEmail', async (email, name, code) => { delivered = { email, name, code }; });
  const res = response();
  await registration.registerUser({ body: { name: ' Customer ', email: ' CUSTOMER@JUICEHOUR.COM ', phone: '01000000000', password: 'test-password', role: 'superadmin' } }, res);
  assert.equal(res.code, 202); assert.equal(res.body.token, undefined); assert.equal(delivered.email, 'customer@juicehour.com');
  assert.match(delivered.code, /^\d{6}$/); assert.ok(await bcrypt.compare('test-password', stored.passwordHash));
  assert.notEqual(stored.codeHash, delivered.code); assert.equal(res.body.code, undefined); assert.equal(res.body.passwordHash, undefined);
  assert.equal(stored.verificationIdHash, createHash('sha256').update(res.body.verificationId).digest('hex'));
}));

test('mail delivery failure removes the pending attempt and never creates an account', async () => withMocks(async mock => {
  let removed;
  mock(User, 'exists', async () => null); mock(Pending, 'findOne', async () => null); mock(Pending, 'findOneAndUpdate', async () => ({}));
  mock(Pending, 'deleteOne', async query => { removed = query; });
  mock(mail, 'sendVerificationEmail', async () => { throw Object.assign(new Error('Email unavailable'), { status: 503 }); });
  const res = response(); await registration.registerUser({ body: { name: 'Customer', email: 'customer@juicehour.com', phone: '01', password: 'test-password' } }, res);
  assert.equal(res.code, 503); assert.equal(removed.email, 'customer@juicehour.com'); assert.ok(removed.verificationIdHash);
}));

test('a valid email code creates only a customer password account and logs in only after verification', async () => withMocks(async mock => {
  let created, consumeQuery;
  const pending = { _id: 'pending', verificationIdHash: hashId, codeHash: hashCode('123456'), name: 'Customer', email: 'customer@juicehour.com', phone: '01', passwordHash: 'already-hashed', attempts: 1 };
  mock(Pending, 'findOneAndUpdate', async query => { assert.equal(query.attempts.$lt, 5); assert.ok(query.expiresAt.$gt); return pending; });
  mock(Pending, 'findOneAndDelete', async query => { consumeQuery = query; return pending; });
  mock(User, 'create', async data => { created = data; return { ...data, _id: "verified-customer" }; });
  const res = response(); await registration.verifyRegistration({ body: { verificationId: id, code: '123456', role: 'superadmin' } }, res);
  assert.equal(res.code, 201); assert.equal(created.role, 'user'); assert.equal(created.authProvider, 'local'); assert.equal(created.password, 'already-hashed'); assert.ok(created.emailVerifiedAt); assert.ok(res.body.token); const claims = require('jsonwebtoken').verify(res.body.token, process.env.JWT_SECRET); assert.equal(claims.id, 'verified-customer'); assert.equal(claims.role, 'user'); assert.equal(res.body.password, undefined); assert.equal(res.body.passwordHash, undefined); assert.equal(consumeQuery.codeHash, pending.codeHash);
}));

test('wrong, expired, exhausted, and consumed codes cannot create an account', async () => withMocks(async mock => {
  let createCount = 0, consumeCount = 0;
  mock(User, 'create', async () => { createCount++; });
  mock(Pending, 'findOneAndUpdate', async () => ({ codeHash: hashCode('123456'), attempts: 5 }));
  mock(Pending, 'findOneAndDelete', async () => { consumeCount++; return null; });
  let res = response(); await registration.verifyRegistration({ body: { verificationId: id, code: '999999' } }, res); assert.equal(res.code, 400); assert.equal(consumeCount, 0);
  mock(Pending, 'findOneAndUpdate', async () => null);
  res = response(); await registration.verifyRegistration({ body: { verificationId: id, code: '123456' } }, res); assert.equal(res.code, 400);
  mock(Pending, 'findOneAndUpdate', async () => ({ codeHash: hashCode('123456'), attempts: 1 }));
  res = response(); await registration.verifyRegistration({ body: { verificationId: id, code: '123456' } }, res); assert.equal(res.code, 400); assert.equal(createCount, 0);
}));

test('resend cooldown prevents sending another email immediately', async () => withMocks(async mock => {
  let sent = false;
  mock(Pending, 'findOne', async () => ({ expiresAt: new Date(Date.now() + 600000), lastSentAt: new Date() }));
  mock(mail, 'sendVerificationEmail', async () => { sent = true; });
  const res = response(); await registration.resendVerification({ body: { verificationId: id } }, res); assert.equal(res.code, 429); assert.ok(res.body.retryAfter > 0); assert.equal(sent, false);
}));

test('Google sign-in rejects an unknown account without creating one', async () => withMocks(async mock => {
  mock(google, 'verifyGoogleIdToken', async () => claims); mock(User, 'findOne', async () => null);
  mock(User, 'create', async () => { throw Error('Sign-in must not create accounts'); });
  const res = response(); await auth.googleAuth({ body: { credential: 'valid-proof' } }, res); assert.equal(res.code, 404); assert.equal(res.body.token, undefined);
}));

test('Google sign-in cannot enter password accounts or staff accounts', async () => withMocks(async mock => {
  mock(google, 'verifyGoogleIdToken', async () => claims);
  for (const role of ['user', 'worker', 'admin', 'superadmin', 'blocked']) {
    mock(User, 'findOne', async () => ({ role, authProvider: 'local' }));
    const res = response(); await auth.googleAuth({ body: { credential: 'valid-proof' } }, res); assert.equal(res.code, role === 'user' ? 409 : 403); assert.equal(res.body.token, undefined);
  }
}));

test('password sign-in rejects Google-only customers; existing staff and legacy customer password access remains', async () => withMocks(async mock => {
  const password = await bcrypt.hash('test-password', 10);
  mock(User, 'findOne', async () => ({ role: 'user', authProvider: 'google', password }));
  let res = response(); await auth.loginUser({ body: { email: 'customer@juicehour.com', password: 'test-password' } }, res); assert.equal(res.code, 409);
  for (const role of ['user', 'worker', 'admin', 'superadmin']) {
    mock(User, 'findOne', async () => ({ _id: 'legacy', role, email: 'legacy@example.com', password }));
    res = response(); await auth.loginUser({ body: { email: 'legacy@example.com', password: 'test-password' } }, res); assert.equal(res.code, 200); assert.ok(res.body.token); assert.equal(res.body.role, role === 'superadmin' ? 'admin' : role);
  }
}));

test('Google signup creates a Google-only customer without a login session', async () => withMocks(async mock => {
  let created;
  mock(google, 'verifyGoogleIdToken', async () => claims); mock(User, 'exists', async () => null); mock(Pending, 'deleteOne', async () => ({}));
  mock(User, 'create', async data => { created = data; return data; });
  const res = response(); await registration.googleRegister({ body: { credential: 'valid-proof', role: 'superadmin' } }, res);
  assert.equal(res.code, 201); assert.equal(created.role, 'user'); assert.equal(created.authProvider, 'google'); assert.equal(created.googleSubject, claims.sub); assert.equal(res.body.token, undefined);
}));

test('Google signup cannot overwrite an existing password account; Google sign-in checks subject', async () => withMocks(async mock => {
  mock(google, 'verifyGoogleIdToken', async () => claims); mock(User, 'exists', async () => ({}));
  let res = response(); await registration.googleRegister({ body: { credential: 'valid-proof' } }, res); assert.equal(res.code, 409);
  mock(User, 'findOne', async () => ({ role: 'user', authProvider: 'google', googleSubject: 'someone-else' }));
  res = response(); await auth.googleAuth({ body: { credential: 'valid-proof' } }, res); assert.equal(res.code, 401);
}));

test('verification email escapes names and includes code, expiry, safety and a plain-text alternative', () => {
  const result = mail.verificationEmail('<img src=x onerror=alert(1)>', '123456');
  assert.ok(!result.html.includes('<img src=x')); assert.ok(result.html.includes('&lt;img')); assert.ok(result.html.includes('123456')); assert.ok(result.html.includes('10 minutes')); assert.ok(result.html.includes('Never share this code')); assert.ok(result.text.includes('123456')); assert.ok(!result.html.includes('your-password'));
});
