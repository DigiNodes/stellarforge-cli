export interface ProjectGeneratorInput {
  readonly projectName: string;
  readonly cwd: string;
}

export interface ValidatedProjectInput extends ProjectGeneratorInput {}

export interface DestinationPlan {
  readonly projectName: string;
  readonly destination: string;
}

export interface TemplateSelection {
  readonly templateId: string;
}

export interface GenerationContext {
  readonly input: ValidatedProjectInput;
  readonly destination: DestinationPlan;
  readonly template: TemplateSelection;
}

export interface ProjectGenerationResult {
  readonly projectName: string;
  readonly destination: string;
  readonly templateId: string;
}

export interface ProjectGeneratorServices {
  validate(input: ProjectGeneratorInput): ValidatedProjectInput;
  planDestination(input: ValidatedProjectInput): DestinationPlan;
  selectTemplate(
    input: ValidatedProjectInput,
    destination: DestinationPlan,
  ): TemplateSelection;
  generate(context: GenerationContext): ProjectGenerationResult;
  install?(result: ProjectGenerationResult): void;
  initializeGit?(result: ProjectGenerationResult): void;
}
