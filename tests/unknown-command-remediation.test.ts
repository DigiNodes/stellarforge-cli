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
  program.configureOutput({
    writeOut: (str) => {
      stdout += str;
    },
    writeErr: (str) => {
      stderr += str;
    },
  });

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

describe('SW-094: Unknown-command remediation copy tests', () => {
  beforeAll(() => {
    buildCli();
  });

  describe('unknown commands fail with concise guidance', () => {
    it('fails consistently on arbitrary unknown command with concise remediation', () => {
      const result = executeProgram(['definitely-unsupported-command']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.code).toBe('commander.excessArguments');
      expect(result.stderr).toContain(
        'error: too many arguments. Expected 0 arguments but got 1: definitely-unsupported-command.',
      );
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
      expect(result.stderr).toContain(
        'Open infrastructure for building production-ready Stellar applications.',
      );
      expect(result.stdout).toBe('');
    });

    const unknownCommandVariants = [
      'unknown',
      'deploy-prod',
      'migrate',
      'init',
      'serve',
      'start',
      'status',
      'help-me',
    ];

    it.each(unknownCommandVariants)(
      'rejects unknown command %s with usage guidance',
      (cmd) => {
        const result = executeProgram([cmd]);

        expect(result.exitCode).toBe(1);
        expect(result.error?.code).toBe('commander.excessArguments');
        expect(result.stderr).toContain(`got 1: ${cmd}`);
        expect(result.stderr).toContain(
          'Usage: stellarforge [options] [command]',
        );
        expect(result.stdout).toBe('');
      },
    );

    it('handles unknown command with additional positional arguments', () => {
      const result = executeProgram(['nonexistent-command', 'arg1', 'arg2']);

      expect(result.exitCode).toBe(1);
      expect(result.error?.code).toBe('commander.excessArguments');
      expect(result.stderr).toContain(
        'error: too many arguments. Expected 0 arguments but got 3: nonexistent-command, arg1, arg2.',
      );
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
    });
  });

  describe('valid command inventory is discoverable in remediation guidance', () => {
    it('exposes complete implemented v1 command inventory in remediation copy', () => {
      const result = executeProgram(['not-a-command']);
      const normalizedStderr = result.stderr.replace(/\s+/g, ' ');

      expect(result.stderr).toContain('Commands:');
      expect(result.stderr).toContain('doctor');
      expect(normalizedStderr).toContain(
        'Check the local StellarForge development environment.',
      );
      expect(result.stderr).toContain('new');
      expect(normalizedStderr).toContain('Create a new StellarForge project.');
      expect(result.stderr).toContain('dev');
      expect(normalizedStderr).toContain(
        'Start development processes for a StellarForge project.',
      );
      expect(result.stderr).toContain('test');
      expect(normalizedStderr).toContain(
        'Run tests for a supported StellarForge project.',
      );
      expect(result.stderr).toContain('deploy');
      expect(normalizedStderr).toContain(
        'Deploy a supported StellarForge project to Stellar Testnet.',
      );
    });

    it('exposes standard global options in remediation copy', () => {
      const result = executeProgram(['not-a-command']);

      expect(result.stderr).toContain('Options:');
      expect(result.stderr).toContain('-V, --version');
      expect(result.stderr).toContain('-h, --help');
    });

    it('conforms to exact implemented v1 command inventory without excess commands', () => {
      const program = createRootCommand('1.0.0');
      const registeredCommands = program.commands.map((cmd) => cmd.name());

      expect(registeredCommands).toEqual([
        'doctor',
        'new',
        'dev',
        'test',
        'deploy',
      ]);
      expect(registeredCommands).toHaveLength(5);
    });
  });

  describe('no post-v1 commands are advertised', () => {
    const postV1Commands = [
      'add',
      'plugin',
      'plugins',
      'remote-template',
      'templates',
      'generate',
      'build',
      'serve',
      'publish',
      'compile',
      'contract',
    ];

    it.each(postV1Commands)(
      'does not advertise %s in remediation command inventory',
      (cmd) => {
        const result = executeProgram(['not-a-command']);

        const commandsSection = result.stderr.split('Commands:')[1] ?? '';
        const commandLines = commandsSection
          .split('\n')
          .map((line) => line.trim());
        const commandNames = commandLines
          .filter((line) => line.length > 0)
          .map((line) => line.split(/\s+/)[0]);

        expect(commandNames).not.toContain(cmd);
      },
    );

    it.each(postV1Commands)(
      'rejects post-v1 command %s as an unknown command',
      (cmd) => {
        const result = executeProgram([cmd]);

        expect(result.exitCode).toBe(1);
        expect(result.error?.code).toBe('commander.excessArguments');
        expect(result.stderr).toContain(`got 1: ${cmd}`);
      },
    );
  });

  describe('executable process exit code conformance', () => {
    it('maps unknown command to validation exit code 2 via built CLI', () => {
      const result = runBuiltCli(['definitely-invalid-command']);

      expect(result.status).toBe(EXIT_CODES.validation);
      expect(result.stderr).toContain('error: too many arguments');
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
      expect(result.stderr).not.toContain(
        'StellarForge encountered an unexpected error.',
      );
    });

    it('maps post-v1 add command to validation exit code 2 via built CLI', () => {
      const result = runBuiltCli(['add']);

      expect(result.status).toBe(EXIT_CODES.validation);
      expect(result.stderr).toContain('error: too many arguments');
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
    });

    it('maps post-v1 plugin command to validation exit code 2 via built CLI', () => {
      const result = runBuiltCli(['plugin']);

      expect(result.status).toBe(EXIT_CODES.validation);
      expect(result.stderr).toContain('error: too many arguments');
      expect(result.stderr).toContain(
        'Usage: stellarforge [options] [command]',
      );
    });
  });

  describe('preserves valid command semantics', () => {
    it('executes root command with no arguments cleanly without error', () => {
      const result = runBuiltCli();

      expect(result.status).toBe(0);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
    });

    it('preserves root --help cleanly', () => {
      const result = runBuiltCli(['--help']);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        'Usage: stellarforge [options] [command]',
      );
      expect(result.stdout).toContain('doctor');
      expect(result.stdout).toContain('new');
      expect(result.stdout).toContain('dev');
      expect(result.stdout).toContain('test');
      expect(result.stdout).toContain('deploy');
      expect(result.stderr).toBe('');
    });

    it('preserves root -V / --version cleanly', () => {
      const result = runBuiltCli(['-V']);

      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('0.1.0');
      expect(result.stderr).toBe('');
    });
  });
});
