import { createRootCommand } from './commands/root.js';

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = createRootCommand();
  await program.parseAsync(argv);
}
