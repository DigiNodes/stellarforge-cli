import { createRootCommand } from './commands/root.js';

export function runCli(argv: string[] = process.argv): void {
  const program = createRootCommand();
  program.parse(argv);
}
