import type {
  DiagnosticCheck,
  DiagnosticReport,
  DiagnosticResult,
  DiagnosticSummary,
} from './types.js';

function failedCheckResult(check: DiagnosticCheck): DiagnosticResult {
  return {
    id: check.id,
    label: check.label,
    status: 'fail',
    message: 'Diagnostic check could not complete.',
    remediation: 'Retry the command or inspect the relevant tool configuration.',
  };
}

function summarize(results: readonly DiagnosticResult[]): DiagnosticSummary {
  let pass = 0;
  let warn = 0;
  let fail = 0;

  for (const result of results) {
    if (result.status === 'pass') pass += 1;
    if (result.status === 'warn') warn += 1;
    if (result.status === 'fail') fail += 1;
  }

  return {
    pass,
    warn,
    fail,
    total: results.length,
  };
}

export function runDiagnostics(
  checks: readonly DiagnosticCheck[],
): DiagnosticReport {
  const results = checks.map((check) => {
    try {
      return check.run();
    } catch {
      return failedCheckResult(check);
    }
  });

  return {
    results,
    summary: summarize(results),
  };
}
