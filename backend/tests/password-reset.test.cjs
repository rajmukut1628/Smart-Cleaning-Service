require('./helpers/ownership.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, createHmac } = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../dist/models/User').default;
const Reset = require('../dist/models/PasswordReset').default;
const mail = require('../dist/utils/passwordResetEmail');
const controller = require('../dist/controllers/passwordResetController');
const { validateSession } = require('../dist/security/ownership');
process.env.JWT_SECRET = 'test-password-reset-secret';
const id = 'a'.repeat(64);
const hash = value => createHash('sha256').update(value).digest('hex');
const codeHash = code => createHmac('sha256', process.env.JWT_SECRET).update(`password-reset:${id}:${code}`).digest('hex');
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
async function mocks(run) { const restore = []; const mock = (obj, key, fn) => { const old = obj[key];obj[key] = fn;restore.push(() => obj[key] = old); };try { await run(mock); } finally { restore.reverse().forEach(fn => fn()); } }
const account = role => ({ _id: 'account-1', name: 'Example', email: 'example@temp.example', role, authProvider: 'local', password: 'old-hash', sessionVersion: 2 });
const pending = () => ({ _id: 'pending-1', userId: 'account-1', email: 'example@temp.example', verificationIdHash: hash(id), codeHash: codeHash('123456'), passwordFingerprint: hash('old-hash'), attempts: 1 });
const body = () => ({ verificationId: id, code: '123456', password: 'new-test-password', confirmPassword: 'new-test-password', role: 'superadmin', userId: 'someone-else' });

test('forgot password returns opaque generic proof and no session or account details', () => mocks(async mock => {
 mock(User, 'findOne', async () => null);
 const a = response(), b = response();
 await controller.forgotPassword({body:{email:'Unknown@Example.com'}},a);
 await controller.forgotPassword({body:{email:'google@example.com'}},b);
 assert.equal(a.code,202);assert.equal(a.body.message,b.body.message);assert.match(a.body.verificationId,/^[a-f0-9]{64}$/);assert.notEqual(a.body.verificationId,b.body.verificationId);assert.equal(a.body.token,undefined);assert.equal(a.body.user,undefined);assert.equal(a.body.retryAfter,60);
}));
test('reset email queues a domain-separated hashed code and password-bound single-use challenge', () => mocks(async mock => {
 let stored, delivered;
 mock(User,'findOne',async query=>{assert.equal(query.email,'example@temp.example');return account('user');});
 mock(Reset,'findOneAndUpdate',async (query,update)=>{assert.equal(query.userId,'account-1');assert.ok(query.$or);stored=update.$set;return stored;});
 mock(mail,'sendPasswordResetEmail',async (email,name,code)=>{delivered={email,name,code};});
 await controller.queuePasswordReset('example@temp.example',id);
 assert.match(delivered.code,/^\d{6}$/);assert.equal(stored.codeHash,codeHash(delivered.code));assert.notEqual(stored.codeHash,delivered.code);assert.equal(stored.verificationIdHash,hash(id));assert.equal(stored.passwordFingerprint,hash('old-hash'));assert.ok(stored.expiresAt.getTime()>Date.now());
}));
test('Google-only, blocked and missing accounts do not receive reset challenges', () => mocks(async mock => {
 let writes=0,sent=0;mock(Reset,'findOneAndUpdate',async()=>{writes++;});mock(mail,'sendPasswordResetEmail',async()=>{sent++;});
 for(const user of [null,{...account('user'),authProvider:'google'},account('blocked')]){mock(User,'findOne',async()=>user);await controller.queuePasswordReset('example@temp.example',id);}
 assert.equal(writes,0);assert.equal(sent,0);
}));
test('per-account cooldown prevents duplicate mail and delivery failure removes only that challenge', () => mocks(async mock => {
 let sent=0,deleted;
 mock(User,'findOne',async()=>account('user'));mock(Reset,'findOneAndUpdate',async()=>{throw {code:11000};});mock(mail,'sendPasswordResetEmail',async()=>{sent++;});
 await controller.queuePasswordReset('example@temp.example',id);assert.equal(sent,0);
 mock(Reset,'findOneAndUpdate',async()=>pending());mock(mail,'sendPasswordResetEmail',async()=>{throw Error('delivery failed');});mock(Reset,'deleteOne',async query=>{deleted=query;});
 await controller.queuePasswordReset('example@temp.example',id);assert.equal(deleted.verificationIdHash,hash(id));assert.equal(deleted.userId,'account-1');
}));
test('reset validates code and matching password lengths before database access', () => mocks(async mock => {
 mock(Reset,'findOneAndUpdate',async()=>{throw Error('must not query');});
 for(const changes of [{verificationId:'bad'},{code:'123'},{password:'short',confirmPassword:'short'},{confirmPassword:'different'},{password:'x'.repeat(73),confirmPassword:'x'.repeat(73)}]){const res=response();await controller.resetPassword({body:{...body(),...changes}},res);assert.equal(res.code,400);}
}));
test('wrong, expired, exhausted and consumed codes never update credentials', () => mocks(async mock => {
 let updates=0;mock(User,'findOneAndUpdate',async()=>{updates++;});
 mock(Reset,'findOneAndUpdate',async query=>{assert.equal(query.attempts.$lt,5);assert.ok(query.expiresAt.$gt);return pending();});
 let res=response();await controller.resetPassword({body:{...body(),code:'999999'}},res);assert.equal(res.code,400);
 mock(Reset,'findOneAndUpdate',async()=>null);res=response();await controller.resetPassword({body:body()},res);assert.equal(res.code,400);
 mock(Reset,'findOneAndUpdate',async()=>pending());mock(User,'findById',async()=>account('user'));mock(Reset,'findOneAndDelete',async()=>null);
 res=response();await controller.resetPassword({body:body()},res);assert.equal(res.code,400);assert.equal(updates,0);
}));
test('password or email changes, Google conversion and blocking invalidate outstanding recovery proof', () => mocks(async mock => {
 mock(Reset,'findOneAndUpdate',async()=>pending());mock(Reset,'findOneAndDelete',async()=>{throw Error('must not consume');});
 for(const user of [{...account('user'),password:'changed'},{...account('user'),email:'changed@example.com'},{...account('user'),authProvider:'google'},account('blocked')]){mock(User,'findById',async()=>user);const res=response();await controller.resetPassword({body:body()},res);assert.equal(res.code,400);}
}));
test('valid resets hash passwords, revoke previous sessions, preserve every account role and never auto-login', () => mocks(async mock => {
 mock(Reset,'findOneAndUpdate',async()=>pending());mock(Reset,'findOneAndDelete',async()=>pending());mock(mail,'sendPasswordChangedEmail',async()=>{});
 for(const role of ['user','worker','admin','superadmin']) {
  const user=account(role);let update,filter,revoked=false,disconnected=false;
  mock(User,'findById',async()=>user);mock(User,'findOneAndUpdate',async (query,data)=>{filter=query;update=data;return {...user,password:data.$set.password,sessionVersion:3};});
  const io={to:room=>({emit:event=>{assert.equal(room,'user:account-1');assert.equal(event,'session-revoked');revoked=true;}}),in:()=>({disconnectSockets:()=>{disconnected=true;}})};
  const res=response();await controller.resetPassword({body:body(),app:{get:()=>io}},res);
  assert.equal(res.code,200);assert.equal(filter._id,'account-1');assert.equal(filter.password,'old-hash');assert.equal(update.$inc.sessionVersion,1);assert.equal(update.$set.role,undefined);assert.equal(update.$set.email,undefined);assert.ok(await bcrypt.compare('new-test-password',update.$set.password));assert.equal(res.body.token,undefined);assert.equal(res.body.password,undefined);assert.ok(revoked&&disconnected);
  await assert.rejects(()=>validateSession({sv:2},{...user,sessionVersion:3}),/revoked/);
 }
}));
test('compare-and-set rejects a password changed concurrently after verification', () => mocks(async mock => {
 mock(Reset,'findOneAndUpdate',async()=>pending());mock(Reset,'findOneAndDelete',async()=>pending());mock(User,'findById',async()=>account('user'));mock(User,'findOneAndUpdate',async()=>null);
 const res=response();await controller.resetPassword({body:body()},res);assert.equal(res.code,400);assert.equal(res.body.token,undefined);
}));
test('reset email is escaped, purpose-specific, and change notification never contains a password or signup claim',()=>{
 const email=mail.passwordResetEmail('<img src=x>','123456');assert.ok(email.html.includes('&lt;img'));assert.ok(!email.html.includes('<img src=x>'));assert.ok(email.html.includes('123456'));assert.ok(email.text.includes('10 minutes'));assert.ok(!email.text.includes('registration'));
 const notice=mail.passwordResetEmail('Customer');assert.ok(notice.text.includes('password has been changed'));assert.ok(!notice.html.includes('YOUR VERIFICATION CODE'));
});
