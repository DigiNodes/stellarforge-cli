import { describe, expect, it } from 'vitest';
import { ValidationCliError } from '../src/errors/errors.js';
import {
  getTemplate,
  listTemplates,
  selectTemplate,
  TEMPLATE_IDS,
} from '../src/generator/template-registry.js';

describe('template registry', () => {
  it('contains only the four supported MVP templates', () => {
    expect(TEMPLATE_IDS).toEqual([
      'basic-app',
      'full-stack',
      'smart-contract',
      'api-service',
    ]);
    expect(listTemplates().map((template) => template.id)).toEqual(
      TEMPLATE_IDS,
    );
  });

  it('provides typed metadata for each controlled template', () => {
    for (const template of listTemplates()) {
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template).not.toHaveProperty('url');
      expect(template).not.toHaveProperty('path');
    }
  });

  it('selects basic-app by default', () => {
    expect(selectTemplate({ projectName: 'demo', cwd: '/workspace' })).toEqual({
      templateId: 'basic-app',
    });
  });

  it('selects a known requested template', () => {
    expect(
      selectTemplate({
        projectName: 'demo',
        cwd: '/workspace',
        templateId: 'smart-contract',
      }),
    ).toEqual({ templateId: 'smart-contract' });
  });

  it('rejects unknown template identifiers without treating them as paths or URLs', () => {
    for (const templateId of [
      '../outside',
      '/tmp/template',
      'https://example.com/template.git',
      'unknown',
    ]) {
      expect(() => getTemplate(templateId)).toThrow(ValidationCliError);
      expect(() => getTemplate(templateId)).toThrow('Supported templates');
    }
  });
});
