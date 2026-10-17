import { Command } from 'commander';
import { resolveCliVersion } from '../version.js';
import { createDeployCommand } from './deploy.js';
import { createDevCommand } from './dev.js';
import { createDoctorCommand } from './doctor.js';
import { createNewCommand } from './new.js';
import { createTestCommand } from './test.js';

export function createRootCommand(version = resolveCliVersion()): Command {
  const program = new Command()
    .name('stellarforge')
    .description(
      'Open infrastructure for building production-ready Stellar applications.',
    )
    .usage('[options] [command]')
    .version(version)
    .exitOverride()
    .showHelpAfterError()
    .showSuggestionAfterError(true)
    .action(() => undefined)
    .addCommand(createDoctorCommand())
    .addCommand(createNewCommand())
    .addCommand(createDevCommand())
    .addCommand(createTestCommand())
    .addCommand(createDeployCommand());

  for (const command of program.commands) {
    command.exitOverride();
    command.showHelpAfterError();
    command.showSuggestionAfterError(true);
  }

  return program;
}
