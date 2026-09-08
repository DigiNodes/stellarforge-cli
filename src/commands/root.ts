import { Command } from 'commander';
import { resolveCliVersion } from '../version.js';
import { createDoctorCommand } from './doctor.js';
import { createNewCommand } from './new.js';

export function createRootCommand(version = resolveCliVersion()): Command {
  return new Command()
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
    .addCommand(createNewCommand());
}
