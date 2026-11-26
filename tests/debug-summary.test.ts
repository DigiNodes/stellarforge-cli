import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createRootCommand,
  resolveExecutionCategory,
} from '../src/commands/root.js';
import {
  elapsedMonotonicMs,
  formatDebugSummary,
  TerminalOutput,
  type TextOutputStream,
} from '../src/output/terminal.js';

function createCapturedOutput() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const createStream = (target: string[]): TextOutputStream => ({
    write(chunk: string) {
      target.push(chunk);
    },
  });

  return {
    output: new TerminalOutput({
      stdout: createStream(stdout),
      stderr: createStream(stderr),
    }),
    stdout,
    stderr,
  };
}

describe('local debug summary', () => {
  it('computes bounded whole-millisecond durations from monotonic nanosecond timestamps', () => {
    expect(elapsedMonotonicMs(1_000_000n, 1_000_000n)).toBe(0);
    expect(elapsedMonotonicMs(5_000_000n, 1_000_000n)).toBe(0);
    expect(elapsedMonotonicMs(0n, 12_499_999n)).toBe(12);
    expect(elapsedMonotonicMs(0n, 12_500_000n)).toBe(13);
    expect(elapsedMonotonicMs(10_000_000n, 255_000_000n)).toBe(245);
  });

  it('formats only execution category and bounded duration', () => {
    expect(
      formatDebugSummary({ category: 'diagnostics', durationMs: 42.6 }),
    ).toBe('[debug] category=diagnostics duration=43ms');
    expect(formatDebugSummary({ category: 'root', durationMs: -5 })).toBe(
      '[debug] category=root duration=0ms',
    );
    expect(
      formatDebugSummary({ category: 'validation', durationMs: Number.NaN }),
    ).toBe('[debug] category=validation duration=0ms');
  });

  it('writes debug summaries to stderr without polluting stdout', () => {
    const { output, stdout, stderr } = createCapturedOutput();

    output.debugSummary({ category: 'testing', durationMs: 18 });

    expect(stdout).toEqual([]);
    expect(stderr).toEqual(['[debug] category=testing duration=18ms\n']);
  });

  it('maps known commands to static execution categories and defaults to root', () => {
    expect(resolveExecutionCategory('doctor')).toBe('diagnostics');
    expect(resolveExecutionCategory('new')).toBe('scaffolding');
    expect(resolveExecutionCategory('dev')).toBe('development');
    expect(resolveExecutionCategory('test')).toBe('testing');
    expect(resolveExecutionCategory('deploy')).toBe('deployment');
    expect(resolveExecutionCategory('validate')).toBe('validation');
    expect(resolveExecutionCategory('stellarforge')).toBe('root');
    expect(resolveExecutionCategory('secret-token-arg')).toBe('root');
  });

  it('is disabled by default when --debug-summary is not passed', async () => {
    const { output, stderr } = createCapturedOutput();
    const ticks = [100_000_000n, 150_000_000n];
    let index = 0;

    const program = createRootCommand('1.0.0', {
      output,
      clock: () => ticks[index++] ?? 150_000_000n,
    });

    await program.parseAsync(['node', 'stellarforge']);

    expect(stderr).toEqual([]);
  });

  it('emits a local-only debug summary when --debug-summary is enabled', async () => {
    const { output, stdout, stderr } = createCapturedOutput();
    const ticks = [1_000_000_000n, 1_027_400_000n];
    let index = 0;

    const program = createRootCommand('1.0.0', {
      output,
      clock: () => ticks[index++] ?? 1_027_400_000n,
    });

    await program.parseAsync(['node', 'stellarforge', '--debug-summary']);

    expect(stdout).toEqual([]);
    expect(stderr).toEqual(['[debug] category=root duration=27ms\n']);
  });

  it('never captures sensitive command arguments, paths, or environment values', async () => {
    const { output, stderr } = createCapturedOutput();
    const ticks = [0n, 5_000_000n];
    let index = 0;
    const secretEnvValue = 'SBSECRET_ENV_VALUE_DO_NOT_LOG';
    const originalEnv = process.env.STELLAR_TEST_SECRET;
    process.env.STELLAR_TEST_SECRET = secretEnvValue;

    try {
      const program = createRootCommand('1.0.0', {
        output,
        clock: () => ticks[index++] ?? 5_000_000n,
      });

      await program.parseAsync(['node', 'stellarforge', '--debug-summary']);

      const rendered = stderr.join('');
      expect(rendered).toBe('[debug] category=root duration=5ms\n');
      expect(rendered).not.toContain(secretEnvValue);
      expect(rendered).not.toContain(process.cwd());
      expect(rendered).not.toContain('--debug-summary');
    } finally {
      if (originalEnv === undefined) {
        delete process.env.STELLAR_TEST_SECRET;
      } else {
        process.env.STELLAR_TEST_SECRET = originalEnv;
      }
    }
  });

  it('advertises --debug-summary in root help and documents local-only behavior', async () => {
    const help = createRootCommand('1.0.0').helpInformation();
    expect(help).toContain('--debug-summary');
    expect(help).toContain('local-only');

    const docsPath = path.resolve(process.cwd(), 'docs/reference/commands.md');
    const docs = await readFile(docsPath, 'utf8');
    expect(docs).toContain('--debug-summary');
    expect(docs).toContain('opt-in and disabled by default');
    expect(docs).toContain('local-only');
    expect(docs).toContain('No telemetry or diagnostic data is sent over the network or persisted to disk');
  });
});
