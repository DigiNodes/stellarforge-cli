/**
 * Bounds constants and utilities for diagnostic text rendering.
 *
 * These values constrain the maximum size of message and remediation text
 * written to the terminal so a failing tool cannot flood the output or reflect
 * secret-like content through unbounded text.
 */

/** Maximum character length for a single diagnostic message. */
export const MAX_DIAGNOSTIC_MESSAGE_LENGTH = 200;

/** Maximum character length for a single diagnostic remediation hint. */
export const MAX_DIAGNOSTIC_REMEDIATION_LENGTH = 200;

/**
 * Truncates `text` to `maxLength` characters, appending an ellipsis when the
 * text is longer than the limit. Returns the empty string when `text` is empty.
 */
export function boundDiagnosticText(text: string, maxLength: number): string {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  const ellipsis = '...';
  return `${text.slice(0, Math.max(0, maxLength - ellipsis.length))}${ellipsis}`;
}
