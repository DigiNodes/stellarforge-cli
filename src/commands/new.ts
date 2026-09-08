import { Command } from 'commander';
import { InternalCliError } from '../errors/errors.js';
import { orchestrateProjectGeneration } from '../generator/orchestrator.js';
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

function createScaffoldServices(): ProjectGeneratorServices {
  return {
    validate: validateProjectInput,
    planDestination: planProjectDestination,
    selectTemplate() {
      throw new InternalCliError({
        cause: new Error('Template selection is not implemented yet.'),
      });
    },
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
    .action((projectName: string) => {
      const result = orchestrateProjectGeneration(
        {
          projectName,
          cwd: cwd(),
        },
        services,
      );

      output.success(
        `Created ${result.projectName} from ${result.templateId} at ${result.destination}.`,
      );
    });
}
