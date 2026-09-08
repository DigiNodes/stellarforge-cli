import { Command } from 'commander';
import {
  superviseDevProcesses,
  type DevOrchestratorOptions,
} from '../dev/orchestrator.js';
import type { DevProcessSpec } from '../dev/project.js';
import {
  resolveTestnetDeploymentPlan,
  type TestnetDeploymentInput,
} from '../deployment/project.js';
import { TerminalOutput } from '../output/terminal.js';

export interface DeployCommandOptions extends DevOrchestratorOptions {
  readonly cwd?: () => string;
  readonly resolvePlan?: (
    input: TestnetDeploymentInput,
  ) => readonly DevProcessSpec[];
}

interface DeployCommandFlags {
  readonly network: string;
  readonly source: string;
}

export function createDeployCommand(
  options: DeployCommandOptions = {},
): Command {
  const cwd = options.cwd ?? process.cwd;
  const output = options.output ?? new TerminalOutput();
  const resolvePlan = options.resolvePlan ?? resolveTestnetDeploymentPlan;

  return new Command('deploy')
    .description('Deploy a supported StellarForge project to Stellar Testnet.')
    .requiredOption(
      '--network <network>',
      'Deployment network. MVP requires the explicit value `testnet`.',
    )
    .requiredOption(
      '--source <identity>',
      'Named Stellar CLI identity alias used to sign the deployment.',
    )
    .action(async (flags: DeployCommandFlags) => {
      const plan = resolvePlan({
        cwd: cwd(),
        network: flags.network,
        source: flags.source,
      });

      output.info('Deploying smart contract to Stellar Testnet.');
      await superviseDevProcesses(plan, { ...options, output });
    });
}
