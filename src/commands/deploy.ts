import { Command } from 'commander';
import {
  resolveProjectConfig,
  type ProjectConfigOverrides,
  type ResolvedProjectConfig,
} from '../config/project.js';
import {
  superviseDevProcesses,
  type DevOrchestratorOptions,
} from '../dev/orchestrator.js';
import type { DevProcessSpec } from '../dev/project.js';
import {
  resolveTestnetDeploymentPlan,
  type TestnetDeploymentInput,
} from '../deployment/project.js';
import { ValidationCliError } from '../errors/errors.js';
import { TerminalOutput } from '../output/terminal.js';

export interface DeployCommandOptions extends DevOrchestratorOptions {
  readonly cwd?: () => string;
  readonly resolveConfig?: (
    cwd: string,
    overrides: ProjectConfigOverrides,
  ) => ResolvedProjectConfig;
  readonly resolvePlan?: (
    input: TestnetDeploymentInput,
  ) => readonly DevProcessSpec[];
}

interface DeployCommandFlags {
  readonly network?: string;
  readonly source?: string;
}

export function createDeployCommand(
  options: DeployCommandOptions = {},
): Command {
  const cwd = options.cwd ?? process.cwd;
  const output = options.output ?? new TerminalOutput();
  const resolveConfig = options.resolveConfig ?? resolveProjectConfig;
  const resolvePlan = options.resolvePlan ?? resolveTestnetDeploymentPlan;

  return new Command('deploy')
    .description('Deploy a supported StellarForge project to Stellar Testnet.')
    .option(
      '--network <network>',
      'Deployment network. CLI value overrides stellarforge.config.json.',
    )
    .option(
      '--source <identity>',
      'Named Stellar CLI identity alias. CLI value overrides project configuration.',
    )
    .action(async (flags: DeployCommandFlags) => {
      const projectRoot = cwd();
      const overrides: ProjectConfigOverrides = {
        ...(flags.network === undefined ? {} : { network: flags.network }),
        ...(flags.source === undefined ? {} : { identity: flags.source }),
      };
      const configuration = resolveConfig(projectRoot, overrides);

      if (configuration.network === undefined) {
        throw new ValidationCliError(
          'Deployment network is required. Pass `--network testnet` or set an explicit network in stellarforge.config.json.',
        );
      }

      if (configuration.identity === undefined) {
        throw new ValidationCliError(
          'Deployment identity is required. Pass `--source <identity>` or set a named identity in stellarforge.config.json.',
        );
      }

      const plan = resolvePlan({
        cwd: projectRoot,
        network: configuration.network,
        source: configuration.identity,
      });

      output.info('Deploying smart contract to Stellar Testnet.');
      await superviseDevProcesses(plan, { ...options, output });
    });
}
