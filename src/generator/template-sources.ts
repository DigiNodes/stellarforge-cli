import { fileURLToPath } from 'node:url';
import { ValidationCliError } from '../errors/errors.js';

const BUNDLED_TEMPLATE_DIRECTORIES = {
  'basic-app': 'basic-app',
} as const;

type BundledTemplateId = keyof typeof BUNDLED_TEMPLATE_DIRECTORIES;

export function resolveBundledTemplateRoot(templateId: string): string {
  const directory =
    BUNDLED_TEMPLATE_DIRECTORIES[templateId as BundledTemplateId];

  if (directory === undefined) {
    throw new ValidationCliError(
      `Template '${templateId}' is registered but is not bundled in this CLI version yet.`,
    );
  }

  return fileURLToPath(new URL(`../../templates/${directory}/`, import.meta.url));
}
