const { test } = require('node:test');
const assert = require('node:assert/strict');
const { devEnvironment } = require('../scripts/dev.cjs');
test('Windows development restart can locate taskkill without changing the parent environment', () => {
  const input = { Path: 'D:\\Tools\\node', SystemRoot: 'C:\\Windows', APP_SETTING: 'unchanged' };
  const output = devEnvironment(input, 'win32');
  assert.equal(output.Path, 'C:\\Windows\\System32;D:\\Tools\\node');
  assert.equal(input.Path, 'D:\\Tools\\node');
  assert.equal(output.APP_SETTING, 'unchanged');
});
test('Windows path repair is idempotent and respects the actual Windows directory', () => {
  const input = { PATH: 'D:\\Win\\System32;D:\\Tools', SYSTEMROOT: 'D:\\Win' };
  assert.deepEqual(devEnvironment(devEnvironment(input, 'win32'), 'win32'), input);
});
test('non-Windows development environments retain their original paths', () => {
  const input = { PATH: '/usr/bin:/bin', APP_SETTING: 'unchanged' };
  assert.deepEqual(devEnvironment(input, 'linux'), input);
});
