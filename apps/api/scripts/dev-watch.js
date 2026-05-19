const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const watchRoots = [
  path.join(projectRoot, 'src'),
  path.resolve(projectRoot, '../../packages/api-contracts/src'),
];
const POLL_INTERVAL_MS = 800;

let child = null;
let restartTimer = null;
let shuttingDown = false;
let lastSnapshot = createSnapshot();

function startChild() {
  child = spawn(
    process.execPath,
    ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', './src/main.ts'],
    {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    }
  );

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal !== 'SIGTERM' && code !== 0) {
      console.error(`[api-dev-watch] child exited with code ${code ?? 'null'} signal ${signal ?? 'null'}`);
    }
  });
}

function restartChild(reason) {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    console.log(`[api-dev-watch] restarting due to ${reason}`);
    if (!child || child.killed) {
      startChild();
      return;
    }
    const currentChild = child;
    child = null;
    currentChild.once('exit', () => {
      if (!shuttingDown) startChild();
    });
    currentChild.kill('SIGTERM');
  }, 120);
}

function collectFiles(root, bucket) {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolutePath, bucket);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|js|json)$/.test(entry.name)) continue;
    const stat = fs.statSync(absolutePath);
    bucket.set(absolutePath, stat.mtimeMs);
  }
}

function createSnapshot() {
  const snapshot = new Map();
  for (const root of watchRoots) {
    if (fs.existsSync(root)) collectFiles(root, snapshot);
  }
  return snapshot;
}

function detectChange(nextSnapshot) {
  if (nextSnapshot.size !== lastSnapshot.size) return 'file set changed';
  for (const [filePath, mtimeMs] of nextSnapshot.entries()) {
    if (lastSnapshot.get(filePath) !== mtimeMs) {
      return path.relative(projectRoot, filePath);
    }
  }
  return null;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shuttingDown = true;
    if (restartTimer) clearTimeout(restartTimer);
    if (child && !child.killed) {
      child.once('exit', () => process.exit(0));
      child.kill(signal);
      return;
    }
    process.exit(0);
  });
}

startChild();

setInterval(() => {
  if (shuttingDown) return;
  try {
    const nextSnapshot = createSnapshot();
    const reason = detectChange(nextSnapshot);
    lastSnapshot = nextSnapshot;
    if (reason) restartChild(reason);
  } catch (error) {
    console.error('[api-dev-watch] polling failed', error);
  }
}, POLL_INTERVAL_MS);
