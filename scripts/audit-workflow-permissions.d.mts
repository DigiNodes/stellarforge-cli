export interface WorkflowPermissionViolation {
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

export function auditWorkflowDirectory(
  dir: string,
): WorkflowPermissionViolation[];
