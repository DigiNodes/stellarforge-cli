import { Command } from 'commander';
import {
  elapsedMonotonicMs,
  TerminalOutput,
  type CommandExecutionCategory,
} from '../output/terminal.js';
import { resolveCliVersion } from '../version.js';
import { createDeployCommand } from './deploy.js';
import { createDevCommand } from './dev.js';
import { createDoctorCommand } from './doctor.js';
import { createNewCommand } from './new.js';
import { createTestCommand } from './test.js';
import { createValidateCommand } from './validate.js';

export interface RootCommandOptions {
  readonly output?: TerminalOutput;
  readonly clock?: () => bigint;
}

const COMMAND_EXECUTION_CATEGORIES: Readonly<
  Record<string, CommandExecutionCategory>
> = {
  doctor: 'diagnostics',
  new: 'scaffolding',
  dev: 'development',
  test: 'testing',
  deploy: 'deployment',
  validate: 'validation',
};

export function resolveExecutionCategory(
  commandName: string,
): CommandExecutionCategory {
  return COMMAND_EXECUTION_CATEGORIES[commandName] ?? 'root';
}

// Commander exposes unknownCommand() at runtime but omits it from its typings.
interface UnknownCommandReporter {
  unknownCommand(): never;
}

function applyUsageErrorHandling(command: Command, remediation: string): void {
  command
    .exitOverride()
    .showHelpAfterError(remediation)
    .showSuggestionAfterError(true);
}

function reportUnknownCommand(command: Command): void {
  if (command.args.length === 0) {
    return;
  }

  (command as unknown as UnknownCommandReporter).unknownCommand();
}

export function createRootCommand(
  version = resolveCliVersion(),
  options: RootCommandOptions = {},
): Command {
  const output = options.output ?? new TerminalOutput();
  const clock = options.clock ?? (() => process.hrtime.bigint());
  let actionStartNs: bigint | undefined;

  const program = new Command()
    .name('stellarforge')
    .description(
      'Open infrastructure for building production-ready Stellar applications.',
    )
    .usage('[options] [command]')
    .version(version)
    .option(
      '--debug-summary',
      'Print a local-only debug summary of command category and duration to stderr.',
    )
    // Allow operands through so the root action can report unknown commands.
    .allowExcessArguments()
    .action((_options: unknown, command: Command) => {
      reportUnknownCommand(command);
    });

  program.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts<{ debugSummary?: boolean }>();
    actionStartNs = opts.debugSummary === true ? clock() : undefined;
  });

  program.hook('postAction', (_thisCommand, actionCommand) => {
    if (actionStartNs === undefined) {
      return;
    }

    const durationMs = elapsedMonotonicMs(actionStartNs, clock());
    actionStartNs = undefined;
    output.debugSummary({
      category: resolveExecutionCategory(actionCommand.name()),
      durationMs,
    });
  });

  const subcommands = [
    createDoctorCommand(),
    createNewCommand(),
    createDevCommand(),
    createTestCommand(),
    createDeployCommand(),
    createValidateCommand(),
  ];

  for (const command of subcommands) {
    program.addCommand(command);
  }

  const commandNames = subcommands.map((command) => command.name()).join(', ');

  applyUsageErrorHandling(
    program,
    `Available commands: ${commandNames}.\nRun 'stellarforge --help' for usage.`,
  );

  for (const command of subcommands) {
    applyUsageErrorHandling(
      command,
      `Run 'stellarforge ${command.name()} --help' for usage.`,
    );
  }

  return program;
}
