import { Command } from 'commander';
import { resolveCliVersion } from '../version.js';
import { createDeployCommand } from './deploy.js';
import { createDevCommand } from './dev.js';
import { createDoctorCommand } from './doctor.js';
import { createNewCommand } from './new.js';
import { createTestCommand } from './test.js';
import { createValidateCommand } from './validate.js';

// Commander exposes unknownCommand() at runtime but omits it from its typings.
interface UnknownCommandReporter {
  unknownCommand(): never;
}

const SUPPORTED_SHELLS = ['bash', 'zsh', 'fish'] as const;
type SupportedShell = (typeof SUPPORTED_SHELLS)[number];

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

function isSupportedShell(shell: string): shell is SupportedShell {
  return (SUPPORTED_SHELLS as readonly string[]).includes(shell);
}

function collectCommandNames(command: Command): string[] {
  return command.commands.map((subcommand) => subcommand.name());
}

function collectOptionNames(command: Command): string[] {
  return command.options
    .map((option) => option.long ?? option.short)
    .filter((name): name is string => typeof name === 'string');
}

function renderBashCompletion(program: Command): string {
  const rootOptions = collectOptionNames(program).join(' ');
  const commandNames = collectCommandNames(program).join(' ');
  const cases = program.commands
    .map((subcommand) => {
      const options = collectOptionNames(subcommand).join(' ');
      return `    ${subcommand.name()})
      opts="${options}"
      ;;
`;
    })
    .join('');

  return `# bash completion for ${program.name()}
_${program.name()}_completion() {
  local cur prev cmd opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  cmd="\${COMP_WORDS[1]}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${commandNames} ${rootOptions}" -- "\${cur}") )
    return 0
  fi

  case "\${cmd}" in
${cases}  esac

  COMPREPLY=( $(compgen -W "\${opts}" -- "\${cur}") )
  return 0
}
complete -F _${program.name()}_completion ${program.name()}
`;
}

function renderZshCompletion(program: Command): string {
  const rootOptions = collectOptionNames(program).join(' ');
  const commandNames = collectCommandNames(program).join(' ');
  const cases = program.commands
    .map((subcommand) => {
      const options = collectOptionNames(subcommand).join(' ');
      return `    ${subcommand.name()})
      opts="${options}"
      ;;
`;
    })
    .join('');

  return `#compdef ${program.name()}
# zsh completion for ${program.name()}
_${program.name()}_completion() {
  local -a commands
  local cmd opts
  commands=(${commandNames})

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    compadd -- ${rootOptions}
    return
  fi

  cmd="\${words[2]}"
  case "\${cmd}" in
${cases}  esac

  compadd -- \${=opts}
}
_${program.name()}_completion "$@"
`;
}

function renderFishCompletion(program: Command): string {
  const lines: string[] = [];
  lines.push(`# fish completion for ${program.name()}`);

  for (const option of program.options) {
    const name = option.long ?? option.short;
    if (!name) {
      continue;
    }
    lines.push(
      `complete -c ${program.name()} -l ${name.replace(/^--/, '')} -d '${option.description.replace(/'/g, "\\'")}'`,
    );
  }

  for (const subcommand of program.commands) {
    lines.push(
      `complete -c ${program.name()} -n '__fish_use_subcommand' -a '${subcommand.name()}' -d '${subcommand.description().replace(/'/g, "\\'")}'`,
    );
    for (const option of subcommand.options) {
      const name = option.long ?? option.short;
      if (!name) {
        continue;
      }
      lines.push(
        `complete -c ${program.name()} -n '__fish_seen_subcommand_from ${subcommand.name()}' -l ${name.replace(/^--/, '')} -d '${option.description.replace(/'/g, "\\'")}'`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

export function generateCompletion(program: Command, shell: string): string {
  if (!isSupportedShell(shell)) {
    throw new Error(
      `Unsupported shell '${shell}'. Supported shells: ${SUPPORTED_SHELLS.join(', ')}.`,
    );
  }

  switch (shell) {
    case 'bash':
      return renderBashCompletion(program);
    case 'zsh':
      return renderZshCompletion(program);
    case 'fish':
      return renderFishCompletion(program);
  }
}

export function createRootCommand(version = resolveCliVersion()): Command {
  const program = new Command()
    .name('stellarforge')
    .description(
      'Open infrastructure for building production-ready Stellar applications.',
    )
    .usage('[options] [command]')
    .version(version)
    // Allow operands through so the root action can report unknown commands.
    .allowExcessArguments()
    .action((_options: unknown, command: Command) => {
      reportUnknownCommand(command);
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

  program
    .command('completion')
    .description('Print a shell completion script for the CLI.')
    .argument('<shell>', `Shell to generate completion for (${SUPPORTED_SHELLS.join(', ')}).`)
    .action((shell: string) => {
      process.stdout.write(generateCompletion(program, shell));
    });

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
