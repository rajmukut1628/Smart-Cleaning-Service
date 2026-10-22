const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const User = require('../dist/models/User').default;
const Platform = require('../dist/models/PlatformOwnership').default;
const security = require('../dist/security/ownership');
const controller = require('../dist/controllers/ownershipController');
const roles = require('../dist/controllers/adminController');
const middleware = require('../dist/middleware/authMiddleware');
const ownerId = '507f1f77bcf86cd799439011', targetId = '507f1f77bcf86cd799439012';
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
async function mocked(run) { const undo = []; const mock = (o, k, fn) => { const original = o[k]; undo.push(() => { o[k] = original; }); o[k] = fn; }; try { await run(mock); } finally { undo.reverse().forEach(fn => fn()); } }
const state = () => ({ ownerId, revision: 0, sessionEpoch: 0, revokedAdminIds: [], accessVersions: new Map(), history: [] });
const request = ownership => ({ user: { _id: ownerId, name: 'Owner', role: 'superadmin' }, ownership, body: { targetId, revision: 0, password: 'test-owner-password', confirmEmail: 'admin@example.test' }, params: { id: targetId }, app: { get: () => undefined } });

test('only the singleton owner has superadmin authority, even when old role fields are stale', () => {
  const snapshot = state();
  assert.equal(security.effectiveRole({ _id: ownerId, role: 'admin' }, snapshot), 'superadmin');
  assert.equal(security.effectiveRole({ _id: targetId, role: 'superadmin' }, snapshot), 'admin');
  let next = false; const res = response(); middleware.superAdmin({ user: { _id: targetId, role: 'superadmin' }, ownership: snapshot }, res, () => { next = true; }); assert.equal(next, false); assert.equal(res.code, 403);
});

test('direct role editing cannot create another superadmin', async () => {
  const res = response(); await roles.updateUserRole({ body: { role: 'superadmin' }, params: { id: targetId } }, res); assert.equal(res.code, 400);
});

test('transfer atomically changes the owner and audit history and invalidates all old staff tokens', async () => mocked(async mock => {
  const password = await bcrypt.hash('test-owner-password', 8); let snapshot = state(), captured, roleWrites = [];
  mock(User, 'findById', id => String(id) === ownerId ? { select: async () => ({ password, authProvider: 'local' }) } : Promise.resolve({ _id: targetId, name: 'New Owner', email: 'admin@example.test', role: 'admin', authProvider: 'local' }));
  mock(Platform, 'findOneAndUpdate', async (filter, update) => { captured = { filter, update }; snapshot = { ...snapshot, ownerId: targetId, revision: 1, sessionEpoch: 1 }; return snapshot; });
  mock(User, 'updateOne', async (filter, update) => { roleWrites.push({ filter, update }); throw Error('Role display write temporarily unavailable'); });
  mock(User, 'find', () => ({ select: async () => [] }));
  const res = response(); await controller.transferOwnership(request(state()), res);
  assert.equal(res.code, 200); assert.equal(captured.filter.ownerId, ownerId); assert.equal(captured.filter.revision, 0); assert.equal(captured.filter.revokedAdminIds.$ne, targetId);
  assert.equal(captured.update.$set.ownerId, targetId); assert.equal(captured.update.$push.history.$each[0].action, 'transferred'); assert.equal(roleWrites.length, 2);
  assert.equal(security.effectiveRole({ _id: ownerId, role: 'superadmin' }, snapshot), 'admin'); assert.equal(security.effectiveRole({ _id: targetId, role: 'admin' }, snapshot), 'superadmin');
  mock(Platform, 'findById', async () => snapshot);
  await assert.rejects(security.validateSession({ sv: 0, ov: 0, staff: true }, { _id: ownerId, role: 'superadmin', sessionVersion: 0 }), /sign in again/);
  await assert.rejects(security.validateSession({ sv: 0, ov: 0, staff: true }, { _id: targetId, role: 'admin', sessionVersion: 0 }), /sign in again/);
}));

test('stale transfer confirmation cannot overwrite a later ownership decision', async () => mocked(async mock => {
  const password = await bcrypt.hash('test-owner-password', 8); let wroteRole = false;
  mock(User, 'findById', id => String(id) === ownerId ? { select: async () => ({ password, authProvider: 'local' }) } : Promise.resolve({ _id: targetId, name: 'Admin', email: 'admin@example.test', role: 'admin' }));
  mock(Platform, 'findOneAndUpdate', async () => null); mock(User, 'updateOne', async () => { wroteRole = true; });
  const res = response(); await controller.transferOwnership(request(state()), res); assert.equal(res.code, 409); assert.equal(wroteRole, false);
}));

test('non-owners, wrong password, and Google-only targets cannot transfer ownership', async () => mocked(async mock => {
  const password = await bcrypt.hash('test-owner-password', 8); let mutations = 0;
  mock(Platform, 'findOneAndUpdate', async () => { mutations++; });
  mock(User, 'findById', id => String(id) === ownerId ? { select: async () => ({ password, authProvider: 'local' }) } : Promise.resolve({ _id: targetId, email: 'admin@example.test', role: 'admin', authProvider: 'google' }));
  let req = request({ ...state(), ownerId: targetId }), res = response(); await controller.transferOwnership(req, res); assert.equal(res.code, 403);
  req = request(state()); req.body.password = 'wrong-password'; res = response(); await controller.transferOwnership(req, res); assert.equal(res.code, 400);
  res = response(); await controller.transferOwnership(request(state()), res); assert.equal(res.code, 400); assert.equal(mutations, 0);
}));

test('the owner cannot be removed and bulk deletion skips both owner and administrator accounts', async () => mocked(async mock => {
  const req = request(state()); req.params.id = ownerId; const res = response(); await controller.removeAdministrator(req, res); assert.equal(res.code, 400);
  let deleted;
  mock(User, 'find', async () => [{ _id: ownerId, role: 'user' }, { _id: targetId, role: 'superadmin' }, { _id: 'customer', role: 'user' }]);
  mock(User, 'deleteMany', async filter => { deleted = filter._id.$in; return { deletedCount: 1 }; });
  const bulk = response(); await roles.bulkDeleteUsers({ user: { _id: 'admin' }, ownership: state(), body: { userIds: [ownerId, targetId, 'customer'] } }, bulk); assert.equal(bulk.code, 200); assert.deepEqual(deleted, ['customer']);
}));

test('admin removal revokes access and sessions in authority even when the display-role write fails', async () => mocked(async mock => {
  const password = await bcrypt.hash('test-owner-password', 8); const snapshot = state(); let disconnected = false;
  mock(User, 'findById', id => String(id) === ownerId ? { select: async () => ({ password, authProvider: 'local' }) } : Promise.resolve({ _id: targetId, name: 'Admin', email: 'admin@example.test', role: 'admin' }));
  mock(Platform, 'findOneAndUpdate', async (_filter, update) => { snapshot.revokedAdminIds.push(update.$addToSet.revokedAdminIds); snapshot.accessVersions.set(targetId, 1); return snapshot; });
  mock(User, 'updateOne', async () => { throw Error('display update failed'); });
  const req = request(state()); req.app = { get: () => ({ to: () => ({ emit: () => {} }), in: () => ({ disconnectSockets: () => { disconnected = true; } }) }) };
  const res = response(); await controller.removeAdministrator(req, res); assert.equal(res.code, 200); assert.ok(disconnected);
  assert.equal(security.effectiveRole({ _id: targetId, role: 'admin' }, snapshot), 'user');
  mock(Platform, 'findById', async () => snapshot);
  await assert.rejects(security.validateSession({ sv: 0, ov: 0, av: 0, staff: true }, { _id: targetId, role: 'admin' }), /revoked/);
}));

test('rerunning bootstrap keeps the transferred owner and never reclaims the default email', async () => mocked(async mock => {
  const snapshot = { ...state(), ownerId: targetId }; let lookedUpBootstrap = false, firstUpdate;
  mock(Platform, 'findById', async () => snapshot); mock(User, 'findById', async () => ({ _id: targetId, role: 'admin', authProvider: 'local' }));
  mock(User, 'findOne', async () => { lookedUpBootstrap = true; throw Error('Must not look up bootstrap email'); });
  mock(User, 'updateOne', async filter => { firstUpdate = filter; }); mock(User, 'updateMany', async () => ({}));
  const result = await security.ensurePlatformOwner(); assert.equal(result.ownerId, targetId); assert.equal(firstUpdate._id, targetId); assert.equal(lookedUpBootstrap, false);
}));
