import { fileURLToPath } from 'node:url';
import { ValidationCliError } from '../errors/errors.js';
import { TEMPLATE_IDS, type TemplateId } from './template-registry.js';

const BUNDLED_TEMPLATE_DIRECTORIES: Record<TemplateId, string> =
  Object.fromEntries(TEMPLATE_IDS.map((id) => [id, id])) as Record<
    TemplateId,
    string
  >;

export function resolveBundledTemplateRoot(templateId: string): string {
  const directory = BUNDLED_TEMPLATE_DIRECTORIES[templateId as TemplateId];

  if (directory === undefined) {
    throw new ValidationCliError(
      'The selected template is not available in this CLI version.',
    );
  }

  return fileURLToPath(
    new URL(`../../templates/${directory}/`, import.meta.url),
  );
}
