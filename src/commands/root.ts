import { Command } from 'commander';

export function createRootCommand(): Command {
  return new Command()
    .name('stellarforge')
    .description(
      'Open infrastructure for building production-ready Stellar applications.',
    )
    .usage('[options]')
    .showHelpAfterError()
    .showSuggestionAfterError(true);
}
