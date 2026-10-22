const path = require('node:path');
const { spawn } = require('node:child_process');

function devEnvironment(base = process.env, platform = process.platform) {
  const env = { ...base };
  if (platform !== 'win32') return env;
  const pathKeys = Object.keys(env).filter(key => key.toLowerCase() === 'path');
  const pathKey = pathKeys[0] || 'Path';
  const rootKey = Object.keys(env).find(key => key.toLowerCase() === 'systemroot');
  const system32 = path.win32.join((rootKey && env[rootKey]) || 'C:\\Windows', 'System32');
  const entries = String(env[pathKey] || '').split(';').filter(entry => entry && entry.toLowerCase() !== system32.toLowerCase());
  for (const key of pathKeys) delete env[key];
  // Keep standard Windows tools available to development child processes.
  env[pathKey] = [system32, ...entries].join(';');
  return env;
}

if (require.main === module) {
  const backend = path.resolve(__dirname, '..');
  const child = spawn(process.execPath, ['--watch', '--require', 'ts-node/register', 'src/server.ts', ...process.argv.slice(2)], {
    cwd: backend, stdio: 'inherit', env: devEnvironment(),
  });
  child.on('error', error => { console.error('Could not start development server:', error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
module.exports = { devEnvironment };
