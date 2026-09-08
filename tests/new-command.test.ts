import { describe, expect, it } from 'vitest';
import { createNewCommand } from '../src/commands/new.js';
import type { ProjectGeneratorServices } from '../src/generator/types.js';
import { createCapturedTerminalOutput } from './helpers/index.js';

function services(calls: string[]): ProjectGeneratorServices {
  return {
    validate(input) {
      calls.push(
        `validate:${input.projectName}:${input.cwd}:${input.templateId ?? 'default'}`,
      );
      return input;
    },
    planDestination(input) {
      calls.push('plan');
      return {
        projectName: input.projectName,
        destination: `/workspace/${input.projectName}`,
      };
    },
    selectTemplate() {
      calls.push('template');
      return { templateId: 'fixture-template' };
    },
    generate(context) {
      calls.push('generate');
      return {
        projectName: context.input.projectName,
        destination: context.destination.destination,
        templateId: context.template.templateId,
      };
    },
  };
}

describe('new command', () => {
  it('delegates project creation to the generator orchestration layer', () => {
    const calls: string[] = [];
    const captured = createCapturedTerminalOutput();
    const command = createNewCommand({
      services: services(calls),
      output: captured.output,
      cwd: () => '/workspace',
    });

    command.parse(['node', 'new', 'demo']);

    expect(calls).toEqual([
      'validate:demo:/workspace:default',
      'plan',
      'template',
      'generate',
    ]);
    expect(captured.stdoutText()).toContain(
      'Created demo from fixture-template at /workspace/demo.',
    );
    expect(captured.stderrText()).toBe('');
  });

  it('forwards an explicit bundled template identifier', () => {
    const calls: string[] = [];
    const command = createNewCommand({
      services: services(calls),
      output: createCapturedTerminalOutput().output,
      cwd: () => '/workspace',
    });

    command.parse(['node', 'new', 'demo', '--template', 'smart-contract']);

    expect(calls[0]).toBe('validate:demo:/workspace:smart-contract');
  });

  it('requires a project name argument', () => {
    const command = createNewCommand({
      services: services([]),
      cwd: () => '/workspace',
    });
    command.exitOverride();

    expect(() => command.parse(['node', 'new'])).toThrow();
  });
});
