import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { ValidationCliError } from '../errors/errors.js';
import type { GenerationContext, ProjectGenerationResult } from './types.js';

const SUBSTITUTION_TOKEN = /\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g;

export interface TemplateGenerationOptions {
  readonly templateRoot: string;
}

function isWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);

  return (
    pathFromRoot.length > 0 &&
    pathFromRoot !== '..' &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot)
  );
}

function assertSafeEntryName(name: string): void {
  if (
    name.length === 0 ||
    name === '.' ||
    name === '..' ||
    name.includes('/') ||
    name.includes('\\')
  ) {
    throw new ValidationCliError('Template contains an unsafe file path.');
  }
}

function renderText(
  input: string,
  variables: Readonly<Record<string, string>>,
): string {
  return input.replace(SUBSTITUTION_TOKEN, (_match, key: string) => {
    const value = variables[key];

    if (value === undefined) {
      throw new ValidationCliError(
        `Template contains unsupported substitution token '{{${key}}}'.`,
      );
    }

    return value;
  });
}

function isBinary(content: Buffer): boolean {
  return content.includes(0);
}

function copyTemplateTree(
  templateRoot: string,
  relativeDirectory: string,
  stagingRoot: string,
  variables: Readonly<Record<string, string>>,
): void {
  const sourceDirectory = resolve(templateRoot, relativeDirectory);
  const entries = readdirSync(sourceDirectory, { withFileTypes: true }).sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });

  for (const entry of entries) {
    assertSafeEntryName(entry.name);

    const relativePath = join(relativeDirectory, entry.name);
    const sourcePath = resolve(templateRoot, relativePath);
    const destinationPath = resolve(stagingRoot, relativePath);

    if (
      !isWithin(templateRoot, sourcePath) ||
      !isWithin(stagingRoot, destinationPath)
    ) {
      throw new ValidationCliError(
        'Template file path escapes the trusted project root.',
      );
    }

    const sourceStat = lstatSync(sourcePath);

    if (sourceStat.isSymbolicLink()) {
      throw new ValidationCliError(
        'Template symbolic links are not supported.',
      );
    }

    if (sourceStat.isDirectory()) {
      mkdirSync(destinationPath, { recursive: false });
      copyTemplateTree(templateRoot, relativePath, stagingRoot, variables);
      continue;
    }

    if (!sourceStat.isFile()) {
      throw new ValidationCliError(
        'Template contains an unsupported filesystem entry.',
      );
    }

    mkdirSync(dirname(destinationPath), { recursive: true });
    const content = readFileSync(sourcePath);

    if (isBinary(content)) {
      writeFileSync(destinationPath, content);
      continue;
    }

    const rendered = renderText(content.toString('utf8'), variables);
    writeFileSync(destinationPath, rendered, 'utf8');
  }
}

function assertDestinationContainment(root: string, destination: string): void {
  const destinationParent = dirname(destination);

  if (!isWithin(destinationParent, destination)) {
    throw new ValidationCliError(
      'Project destination escapes its validated parent directory.',
    );
  }

  if (existsSync(root)) {
    try {
      const realRoot = realpathSync(root);
      let existing = destination;
      while (!existsSync(existing)) {
        const parent = dirname(existing);
        if (parent === existing) break;
        existing = parent;
      }

      if (existsSync(existing)) {
        const realExisting = realpathSync(existing);
        const rel = relative(realRoot, realExisting);
        if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
          throw new ValidationCliError(
            'Project destination escapes its validated parent directory.',
          );
        }
      }
    } catch (error) {
      if (error instanceof ValidationCliError) throw error;
    }
  }

  let current = destination;
  while (current !== dirname(current)) {
    const parent = dirname(current);
    if (existsSync(current) && existsSync(parent)) {
      try {
        const realCurrent = realpathSync(current);
        const realParent = realpathSync(parent);
        const rel = relative(realParent, realCurrent);
        if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
          throw new ValidationCliError(
            'Project destination escapes its validated parent directory.',
          );
        }
      } catch (error) {
        if (error instanceof ValidationCliError) throw error;
      }
    }
    current = parent;
  }
}

export function generateProjectFromTemplate(
  context: GenerationContext,
  options: TemplateGenerationOptions,
): ProjectGenerationResult {
  const templateRoot = resolve(options.templateRoot);
  const destination = resolve(context.destination.destination);
  const destinationParent = dirname(destination);
  const root = resolve(context.input.cwd);

  if (!existsSync(templateRoot) || !lstatSync(templateRoot).isDirectory()) {
    throw new ValidationCliError('Selected template source is unavailable.');
  }

  if (lstatSync(templateRoot).isSymbolicLink()) {
    throw new ValidationCliError(
      'Template source must not be a symbolic link.',
    );
  }

  assertDestinationContainment(root, destination);

  const destinationExisted = existsSync(destination);

  if (destinationExisted) {
    const destinationStat = lstatSync(destination);

    if (!destinationStat.isDirectory() || destinationStat.isSymbolicLink()) {
      throw new ValidationCliError(
        'Project destination is not a safe empty directory.',
      );
    }

    if (readdirSync(destination).length > 0) {
      throw new ValidationCliError(
        'Project destination must be empty before generation.',
      );
    }
  }

  const stagingRoot = mkdtempSync(
    join(destinationParent, `.stellarforge-${context.input.projectName}-`),
  );
  let removedExistingDestination = false;

  try {
    copyTemplateTree(templateRoot, '.', stagingRoot, {
      projectName: context.input.projectName,
      templateId: context.template.templateId,
    });

    if (destinationExisted) {
      rmdirSync(destination);
      removedExistingDestination = true;
    }

    renameSync(stagingRoot, destination);
  } catch (error) {
    rmSync(stagingRoot, { recursive: true, force: true });

    if (removedExistingDestination && !existsSync(destination)) {
      mkdirSync(destination);
    }

    throw error;
  }

  return {
    projectName: context.input.projectName,
    destination,
    templateId: context.template.templateId,
  };
}
