import { Command } from 'commander';
import { InternalCliError } from '../errors/errors.js';
import { orchestrateProjectGeneration } from '../generator/orchestrator.js';
import { selectTemplate } from '../generator/template-registry.js';
import type { ProjectGeneratorServices } from '../generator/types.js';
import {
  planProjectDestination,
  validateProjectInput,
} from '../generator/validation.js';
import { TerminalOutput } from '../output/terminal.js';

export interface NewCommandOptions {
  readonly services?: ProjectGeneratorServices;
  readonly output?: TerminalOutput;
  readonly cwd?: () => string;
}

interface NewCommandFlags {
  readonly template?: string;
}

function createScaffoldServices(): ProjectGeneratorServices {
  return {
    validate: validateProjectInput,
    planDestination: planProjectDestination,
    selectTemplate,
    generate() {
      throw new InternalCliError({
        cause: new Error('Project generation is not implemented yet.'),
      });
    },
  };
}

export function createNewCommand(options: NewCommandOptions = {}): Command {
  const services = options.services ?? createScaffoldServices();
  const output = options.output ?? new TerminalOutput();
  const cwd = options.cwd ?? process.cwd;

  return new Command('new')
    .description('Create a new StellarForge project.')
    .argument('<project-name>', 'Name of the project to create.')
    .option(
      '-t, --template <id>',
      'Bundled template: basic-app, full-stack, smart-contract, or api-service.',
    )
    .action((projectName: string, flags: NewCommandFlags) => {
      const result = orchestrateProjectGeneration(
        {
          projectName,
          cwd: cwd(),
          ...(flags.template === undefined
            ? {}
            : { templateId: flags.template }),
        },
        services,
      );

      output.success(
        `Created ${result.projectName} from ${result.templateId} at ${result.destination}.`,
      );
    });
}
