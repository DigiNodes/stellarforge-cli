import { Command } from 'commander';
import {
  superviseDevProcesses,
  type DevOrchestratorOptions,
} from '../dev/orchestrator.js';
import { resolveDevProcessPlan, type DevProcessSpec } from '../dev/project.js';
import { TerminalOutput } from '../output/terminal.js';

export interface DevCommandOptions extends DevOrchestratorOptions {
  readonly cwd?: () => string;
  readonly resolvePlan?: (cwd: string) => readonly DevProcessSpec[];
}

export function createDevCommand(options: DevCommandOptions = {}): Command {
  const cwd = options.cwd ?? process.cwd;
  const output = options.output ?? new TerminalOutput();
  const resolvePlan = options.resolvePlan ?? resolveDevProcessPlan;

  return new Command('dev')
    .description('Start development processes for a StellarForge project.')
    .action(async () => {
      const plan = resolvePlan(cwd());
      output.info(
        `Starting ${plan.length} development process${plan.length === 1 ? '' : 'es'}.`,
      );
      await superviseDevProcesses(plan, { ...options, output });
    });
}
