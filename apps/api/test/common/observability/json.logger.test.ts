import * as assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';
import { JsonLogger } from '../../../src/common/observability/json.logger';
import { runWithRequestContext } from '../../../src/common/observability/request-context';

interface CapturedStream {
  lines: string[];
  restore: () => void;
}

function captureStream(stream: NodeJS.WriteStream): CapturedStream {
  const original = stream.write.bind(stream);
  const lines: string[] = [];
  stream.write = ((chunk: unknown): boolean => {
    if (typeof chunk === 'string') {
      lines.push(chunk.trim());
    }
    return true;
  }) as typeof stream.write;
  return {
    lines,
    restore: () => {
      stream.write = original as typeof stream.write;
    },
  };
}

let activeCapture: CapturedStream | null = null;

afterEach(() => {
  activeCapture?.restore();
  activeCapture = null;
});

test('JsonLogger emits structured JSON to stdout for log level', () => {
  activeCapture = captureStream(process.stdout);
  const logger = new JsonLogger();
  logger.log('hello world', 'MyContext', { foo: 'bar', n: 1 });

  assert.equal(activeCapture.lines.length, 1);
  const record = JSON.parse(activeCapture.lines[0]!);
  assert.equal(record.level, 'log');
  assert.equal(record.ctx, 'MyContext');
  assert.equal(record.msg, 'hello world');
  assert.equal(record.foo, 'bar');
  assert.equal(record.n, 1);
  assert.equal(typeof record.ts, 'string');
  assert.equal(record.requestId, null);
});

test('JsonLogger emits errors to stderr and includes stack', () => {
  activeCapture = captureStream(process.stderr);
  const logger = new JsonLogger();
  logger.error('boom', 'stack-trace', 'ErrCtx', { code: 'X' });

  assert.equal(activeCapture.lines.length, 1);
  const record = JSON.parse(activeCapture.lines[0]!);
  assert.equal(record.level, 'error');
  assert.equal(record.ctx, 'ErrCtx');
  assert.equal(record.stack, 'stack-trace');
  assert.equal(record.code, 'X');
});

test('JsonLogger injects requestId from AsyncLocalStorage', () => {
  activeCapture = captureStream(process.stdout);
  const logger = new JsonLogger();
  runWithRequestContext({ requestId: 'req-T1' }, () => {
    logger.log('with context', 'Ctx');
  });

  const record = JSON.parse(activeCapture!.lines[0]!);
  assert.equal(record.requestId, 'req-T1');
});

test('JsonLogger flattens Error objects in fields', () => {
  activeCapture = captureStream(process.stdout);
  const logger = new JsonLogger();
  logger.log('with error', 'Ctx', { err: new Error('reason') });

  const record = JSON.parse(activeCapture!.lines[0]!);
  assert.deepEqual(record.err, { name: 'Error', message: 'reason' });
});
