import { Command } from 'commander';
import {
  superviseDevProcesses,
  type DevOrchestratorOptions,
} from '../dev/orchestrator.js';
import type { DevProcessSpec } from '../dev/project.js';
import { TerminalOutput } from '../output/terminal.js';
import {
  DEFAULT_TEST_TIMEOUT_MS,
  TEST_TIMEOUT_GRACE_MS,
  resolveTestProcessPlan,
} from '../testing/project.js';


export interface TestCommandOptions extends DevOrchestratorOptions {
  readonly cwd?: () => string;
  readonly resolvePlan?: (cwd: string) => readonly DevProcessSpec[];
  /**
   * Override the test workflow timeout (milliseconds). Defaults to
   * `DEFAULT_TEST_TIMEOUT_MS` when not provided. This is the approved
   * interface for configuring the timeout; it is intentionally not
   * exposed as an interactive prompt.
   */
  readonly timeoutMs?: number;
}

export function createTestCommand(options: TestCommandOptions = {}): Command {
  const cwd = options.cwd ?? process.cwd;
  const output = options.output ?? new TerminalOutput();
  const resolvePlan = options.resolvePlan ?? resolveTestProcessPlan;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TEST_TIMEOUT_MS;

  return new Command('test')
    .description('Run tests for a supported StellarForge project.')
    .action(async () => {
      const plan = resolvePlan(cwd());
      output.info(
        `Running ${plan.length} project test workflow${plan.length === 1 ? '' : 's'}.`,
      );
      output.info(
        `Test workflow timeout: ${timeoutMs}ms (configurable via the test command options).`,
      );

      await superviseDevProcesses(plan, {
        ...options,
        output,
        timeoutMs,
        terminationGraceMs: options.terminationGraceMs ?? TEST_TIMEOUT_GRACE_MS,
        timeoutMessage:
          options.timeoutMessage ??
          `Test workflow timed out after ${timeoutMs}ms. Stopping child process tree. This is a timeout, not a test failure.`,
      });

    });
}
