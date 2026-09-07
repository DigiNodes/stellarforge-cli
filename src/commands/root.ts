import { Command } from 'commander';
import { resolveCliVersion } from '../version.js';

export function createRootCommand(version = resolveCliVersion()): Command {
  return new Command()
    .name('stellarforge')
    .description(
      'Open infrastructure for building production-ready Stellar applications.',
    )
    .usage('[options]')
    .version(version)
    .exitOverride()
    .showHelpAfterError()
    .showSuggestionAfterError(true);
}
