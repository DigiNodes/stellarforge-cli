import { describe, expect, it } from 'vitest';
import { orchestrateProjectGeneration } from '../src/generator/orchestrator.js';
import type { ProjectGeneratorServices } from '../src/generator/types.js';
import { ValidationCliError } from '../src/errors/errors.js';

function createServices(calls: string[]): ProjectGeneratorServices {
  return {
    validate(input) {
      calls.push('validate');
      return input;
    },
    planDestination(input) {
      calls.push('planDestination');
      return {
        projectName: input.projectName,
        destination: `/tmp/${input.projectName}`,
      };
    },
    selectTemplate() {
      calls.push('selectTemplate');
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
    install() {
      calls.push('install');
    },
    initializeGit() {
      calls.push('initializeGit');
    },
  };
}

describe('project generation orchestration', () => {
  it('executes generation stages in a deterministic order', () => {
    const calls: string[] = [];
    const result = orchestrateProjectGeneration(
      { projectName: 'demo', cwd: '/workspace' },
      createServices(calls),
    );

    expect(calls).toEqual([
      'validate',
      'planDestination',
      'selectTemplate',
      'generate',
      'install',
      'initializeGit',
    ]);
    expect(result).toEqual({
      projectName: 'demo',
      destination: '/tmp/demo',
      templateId: 'fixture-template',
    });
  });

  it('stops before any later stage when validation fails', () => {
    const calls: string[] = [];
    const services = createServices(calls);
    services.validate = () => {
      calls.push('validate');
      throw new ValidationCliError('Invalid project name.');
    };

    expect(() =>
      orchestrateProjectGeneration(
        { projectName: '../unsafe', cwd: '/workspace' },
        services,
      ),
    ).toThrow(ValidationCliError);
    expect(calls).toEqual(['validate']);
  });

  it('does not require optional install or Git stages', () => {
    const calls: string[] = [];
    const services = createServices(calls);
    delete services.install;
    delete services.initializeGit;

    const result = orchestrateProjectGeneration(
      { projectName: 'demo', cwd: '/workspace' },
      services,
    );

    expect(calls).toEqual([
      'validate',
      'planDestination',
      'selectTemplate',
      'generate',
    ]);
    expect(result.projectName).toBe('demo');
  });
});
