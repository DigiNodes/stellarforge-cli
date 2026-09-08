import { Command } from 'commander';
import { EXIT_CODES } from '../errors/errors.js';
import { runDiagnostics } from '../diagnostics/run.js';
import type {
  DiagnosticCheck,
  DiagnosticReport,
  DiagnosticResult,
} from '../diagnostics/types.js';
import { TerminalOutput } from '../output/terminal.js';

export interface DoctorCommandOptions {
  readonly checks?: readonly DiagnosticCheck[];
  readonly output?: TerminalOutput;
  readonly setExitCode?: (code: number) => void;
}

function formatResult(result: DiagnosticResult): string {
  return `[${result.status.toUpperCase()}] ${result.label}: ${result.message}`;
}

export function renderDiagnosticReport(
  report: DiagnosticReport,
  output: TerminalOutput,
): void {
  if (report.results.length === 0) {
    output.info('No diagnostics are registered yet.');
  }

  for (const result of report.results) {
    output.info(formatResult(result));

    if (result.remediation) {
      output.info(`  Remediation: ${result.remediation}`);
    }
  }

  output.info(
    `Summary: ${report.summary.pass} passed, ${report.summary.warn} warnings, ${report.summary.fail} failed.`,
  );
}

export function createDoctorCommand(
  options: DoctorCommandOptions = {},
): Command {
  const checks = options.checks ?? [];
  const output = options.output ?? new TerminalOutput();
  const setExitCode =
    options.setExitCode ?? ((code) => (process.exitCode = code));

  return new Command('doctor')
    .description('Check the local StellarForge development environment.')
    .action(() => {
      const report = runDiagnostics(checks);
      renderDiagnosticReport(report, output);
      setExitCode(
        report.summary.fail > 0 ? EXIT_CODES.diagnostic : EXIT_CODES.success,
      );
    });
}
