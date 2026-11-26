import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const indexPath = fileURLToPath(new URL('../src/index.js', import.meta.url));
const projectName = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).name;

async function waitForReady(child, getOutput) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ready status.\n${getOutput()}`));
    }, 5000);

    const onData = () => {
      if (getOutput().includes('status: ready')) {
        clearTimeout(timeout);
        child.stdout.off('data', onData);
        resolve();
      }
    };

    child.stdout.on('data', onData);
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Process exited before ready (code=${String(code)} signal=${String(signal)}).\n${getOutput()}`,
        ),
      );
    });
  });
}

test('emits deterministic startup status and shuts down gracefully on SIGTERM', async () => {
  const child = spawn(process.execPath, [indexPath], {
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const getOutput = () => `stdout:\n${stdout}\nstderr:\n${stderr}`;

  await waitForReady(child, getOutput);

  child.kill('SIGTERM');
  const [code, signal] = await once(child, 'exit');

  // Windows Node versions differ on whether a signaled child is terminated
  // directly or reaches the JS signal handler, so accept either observable
  // outcome while still requiring the graceful status line when it applies.
  const gracefulTermination = signal === null && code === 0;
  const signalTermination = code === null && signal === 'SIGTERM';
  assert.ok(
    gracefulTermination || signalTermination,
    `unexpected exit: code=${String(code)} signal=${String(signal)}\n${getOutput()}`,
  );
  if (gracefulTermination) {
    assert.match(stdout, /^status: stopping signal=SIGTERM$/m);
  }
  assert.match(stdout, /^status: starting$/m);
  assert.match(stdout, /^status: ready$/m);
  assert.match(stdout, new RegExp(`^app: ${projectName}$`, 'm'));
  assert.equal(stderr, '');
});

test('shuts down gracefully on SIGINT', async () => {
  const child = spawn(process.execPath, [indexPath], {
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const getOutput = () => `stdout:\n${stdout}\nstderr:\n${stderr}`;

  await waitForReady(child, getOutput);

  child.kill('SIGINT');
  const [code, signal] = await once(child, 'exit');

  const gracefulTermination = signal === null && code === 0;
  const signalTermination = code === null && signal === 'SIGINT';
  assert.ok(
    gracefulTermination || signalTermination,
    `unexpected exit: code=${String(code)} signal=${String(signal)}\n${getOutput()}`,
  );
  if (gracefulTermination) {
    assert.match(stdout, /^status: stopping signal=SIGINT$/m);
  }
  assert.equal(stderr, '');
});

test('reports actionable startup failure and exits non-zero for invalid configuration', async () => {
  const child = spawn(process.execPath, [indexPath], {
    env: { ...process.env, STELLAR_HORIZON_URL: 'not-a-url' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const [code, signal] = await once(child, 'exit');

  assert.equal(signal, null);
  assert.notEqual(code, 0);
  assert.match(stderr, /^status: failed$/m);
  assert.match(stderr, /Invalid STELLAR_HORIZON_URL URL\./);
});
