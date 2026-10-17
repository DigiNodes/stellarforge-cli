import { CommanderError } from 'commander';
import { beforeAll, describe, expect, it } from 'vitest';
import { createRootCommand } from '../src/commands/root.js';
import { EXIT_CODES } from '../src/errors/errors.js';
import { buildCli, runBuiltCli } from './helpers/cli-process.js';

interface CapturedCommandRun {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly error: CommanderError | null;
}

function executeProgram(args: string[]): CapturedCommandRun {
  let stdout = '';
  let stderr = '';
  let error: CommanderError | null = null;
  let exitCode = 0;

  const program = createRootCommand('1.0.0');
  const applyOutputCapture = (cmd: typeof program) => {
    cmd.configureOutput({
      writeOut: (str) => {
        stdout += str;
      },
      writeErr: (str) => {
        stderr += str;
      },
    });
    for (const sub of cmd.commands) {
      applyOutputCapture(sub);
    }
  };
  applyOutputCapture(program);

  try {
    program.parse(['node', 'stellarforge', ...args]);
  } catch (err) {
    if (err instanceof CommanderError) {
      error = err;
      exitCode = err.exitCode;
    } else {
      throw err;
    }
  }

  return { exitCode, stdout, stderr, error };
}

describe('SW-095: Unknown-option remediation copy tests', () => {
  beforeAll(() => {
    buildCli();
  });

  describe('root command unknown options', () => {
    it('fails on long-form unknown option with concise remediation guidance', () => {
      const result = executeProgram(['--definitely-unsupported-option']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.code).toBe('commander.unknownOption');
      expect(result.stderr).toContain(
        "error: unknown option '--definitely-unsupported-option'",
      );
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
      expect(result.stderr).toContain('-V, --version');
      expect(result.stderr).toContain('-h, --help');
      expect(result.stderr).toContain('doctor');
      expect(result.stderr).toContain('new');
      expect(result.stderr).toContain('dev');
      expect(result.stderr).toContain('test');
      expect(result.stderr).toContain('deploy');
      expect(result.stdout).toBe('');
    });

    it('fails on short-form unknown option with usage copy', () => {
      const result = executeProgram(['-z']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.code).toBe('commander.unknownOption');
      expect(result.stderr).toContain("error: unknown option '-z'");
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
      expect(result.stdout).toBe('');
    });

    it('suggests closest match for option typos at root level', () => {
      const result = executeProgram(['--verison']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.code).toBe('commander.unknownOption');
      expect(result.stderr).toContain("error: unknown option '--verison'");
      expect(result.stderr).toContain('(Did you mean --version?)');
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
    });

    it('handles value-bearing unknown options consistently', () => {
      const result = executeProgram(['--custom-arg=unexpected-value']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.code).toBe('commander.unknownOption');
      expect(result.stderr).toContain(
        "error: unknown option '--custom-arg=unexpected-value'",
      );
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
    });
  });

  describe('subcommand unknown options fail consistently', () => {
    const representativeSubcommands = [
      {
        command: 'doctor',
        args: ['doctor', '--invalid-doctor-flag'],
        expectedOption: '--invalid-doctor-flag',
        expectedUsage: 'Usage: stellarforge doctor [options]',
      },
      {
        command: 'new',
        args: ['new', 'my-project', '--invalid-new-flag'],
        expectedOption: '--invalid-new-flag',
        expectedUsage: 'Usage: stellarforge new [options] <project-name>',
      },
      {
        command: 'dev',
        args: ['dev', '--invalid-dev-flag'],
        expectedOption: '--invalid-dev-flag',
        expectedUsage: 'Usage: stellarforge dev [options]',
      },
      {
        command: 'test',
        args: ['test', '--invalid-test-flag'],
        expectedOption: '--invalid-test-flag',
        expectedUsage: 'Usage: stellarforge test [options]',
      },
      {
        command: 'deploy',
        args: ['deploy', '--invalid-deploy-flag'],
        expectedOption: '--invalid-deploy-flag',
        expectedUsage: 'Usage: stellarforge deploy [options]',
      },
    ];

    it.each(representativeSubcommands)(
      'rejects unknown option on $command subcommand with focused usage copy',
      ({ args, expectedOption, expectedUsage }) => {
        const result = executeProgram(args);

        expect(result.exitCode).toBe(1);
        expect(result.error?.code).toBe('commander.unknownOption');
        expect(result.stderr).toContain(
          `error: unknown option '${expectedOption}'`,
        );
        expect(result.stderr).toContain(expectedUsage);
        expect(result.stdout).toBe('');
      },
    );

    it.each(representativeSubcommands)(
      'rejects single-character short unknown option on $command subcommand',
      ({ command, expectedUsage }) => {
        const result = executeProgram([command, '-x']);

        expect(result.exitCode).toBe(1);
        expect(result.error?.code).toBe('commander.unknownOption');
        expect(result.stderr).toContain("error: unknown option '-x'");
        expect(result.stderr).toContain(expectedUsage);
      },
    );

    it('suggests closest match for template option typo on new subcommand', () => {
      const result = executeProgram([
        'new',
        'sample-project',
        '--temlate',
        'basic-app',
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.error?.code).toBe('commander.unknownOption');
      expect(result.stderr).toContain("error: unknown option '--temlate'");
      expect(result.stderr).toContain('(Did you mean --template?)');
      expect(result.stderr).toContain(
        'Usage: stellarforge new [options] <project-name>',
      );
    });

    it('suggests closest match for network option typo on deploy subcommand', () => {
      const result = executeProgram(['deploy', '--netwrk', 'testnet']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.code).toBe('commander.unknownOption');
      expect(result.stderr).toContain("error: unknown option '--netwrk'");
      expect(result.stderr).toContain('(Did you mean --network?)');
      expect(result.stderr).toContain('Usage: stellarforge deploy [options]');
    });
  });

  describe('executable process exit code conformance', () => {
    it('maps root unknown option to validation exit code 2 via built CLI', () => {
      const result = runBuiltCli(['--unknown-cli-option']);

      expect(result.status).toBe(EXIT_CODES.validation);
      expect(result.stderr).toContain(
        "error: unknown option '--unknown-cli-option'",
      );
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
      expect(result.stderr).not.toContain(
        'StellarForge encountered an unexpected error.',
      );
    });

    it('maps subcommand unknown option to validation exit code 2 via built CLI', () => {
      const result = runBuiltCli(['doctor', '--unknown-doctor-option']);

      expect(result.status).toBe(EXIT_CODES.validation);
      expect(result.stderr).toContain(
        "error: unknown option '--unknown-doctor-option'",
      );
      expect(result.stderr).toContain('Usage: stellarforge doctor [options]');
      expect(result.stderr).not.toContain(
        'StellarForge encountered an unexpected error.',
      );
    });

    it('maps short unknown option on deploy subcommand to validation exit code 2', () => {
      const result = runBuiltCli(['deploy', '-u']);

      expect(result.status).toBe(EXIT_CODES.validation);
      expect(result.stderr).toContain("error: unknown option '-u'");
      expect(result.stderr).toContain('Usage: stellarforge deploy [options]');
    });
  });

  describe('preserves valid command semantics', () => {
    it('preserves root --help without error', () => {
      const result = executeProgram(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.error?.code).toBe('commander.helpDisplayed');
      expect(result.stdout).toContain(
        'Usage: stellarforge [options] [command]',
      );
      expect(result.stderr).toBe('');
    });

    it('preserves root -V / --version without error', () => {
      const result = executeProgram(['-V']);

      expect(result.exitCode).toBe(0);
      expect(result.error?.code).toBe('commander.version');
      expect(result.stdout.trim()).toBe('1.0.0');
      expect(result.stderr).toBe('');
    });

    it('preserves subcommand help displays', () => {
      const result = executeProgram(['doctor', '--help']);

      expect(result.exitCode).toBe(0);
      expect(result.error?.code).toBe('commander.helpDisplayed');
      expect(result.stdout).toContain('Usage: stellarforge doctor [options]');
      expect(result.stdout).toContain(
        'Check the local StellarForge development environment.',
      );
      expect(result.stderr).toBe('');
    });
  });
});
