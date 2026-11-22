export const REDACTED_PLACEHOLDER = '[REDACTED]';

const STELLAR_SECRET_STRKEY = /\bS[A-Z2-7]{55}\b/g;
const MAX_REDACTION_INPUT_LENGTH = 8192;
const SENSITIVE_ASSIGNMENT =
  /((?:secret(?:[ _-]?key)?|private[ _-]?key|seed(?:[ _-]?phrase)?|mnemonic|password|passphrase|(?:api|auth|access)?[_-]?token)["']?\s*[:=]\s*)\S.*$/gi;
const BEARER_CREDENTIAL = /\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi;
const TOKEN_LITERAL = /\btok_[A-Za-z0-9_-]+\b/gi;
const TOKEN_QUERY_KEY =
  /^(?:token|access_token|id_token|refresh_token|api[_-]?key|apikey|auth|authorization|signature|sig|jwt|password|passphrase|secret)$/i;
const URL_WITH_CREDENTIALS =
  /\b([a-z][a-z0-9+.-]*:\/\/)([^\s"'<>@]*):([^\s"'<>@]*)@/gi;
const URL_WITH_QUERY = /\b([a-z][a-z0-9+.-]*:\/\/[^\s"'<>?]*\?)([^\s"'<>]*)/gi;

// Temporary separator used while redacting URL query values. It prevents the
// sensitive-assignment rule from treating an already-redacted query parameter
// as a whole-line secret and dropping the remaining query parameters.
const REDACTED_ASSIGNMENT_MARKER = '\ue000';

/**
 * Redacts sensitive values in a URL query while preserving the original key
 * spelling, the query separator, and every unrelated parameter.
 */
function redactUrlQuery(query: string): string {
  return query.replace(/([^?&#=]+)=([^&#]*)/g, (match, key) => {
    if (!TOKEN_QUERY_KEY.test(String(key))) {
      return match;
    }

    return `${String(key)}${REDACTED_ASSIGNMENT_MARKER}${REDACTED_PLACEHOLDER}`;
  });
}

function redactUrls(text: string): string {
  return text
    .replace(URL_WITH_CREDENTIALS, '$1' + REDACTED_PLACEHOLDER + '@')
    .replace(URL_WITH_QUERY, (_match, prefix, query) => {
      return `${prefix}${redactUrlQuery(query)}`;
    });
}

/**
 * Replaces secret-like material in a single line of untrusted text.
 *
 * Redaction is intentionally conservative: once a sensitive label such as
 * `secret:` or `mnemonic=` is seen, the remainder of the line is withheld,
 * because multi-word values such as seed phrases cannot be bounded reliably.
 * URL userinfo is redacted only when an actual `user:password@` pair is
 * present; token-bearing query parameters are redacted individually so other
 * query parameters survive.
 */
export function redactSecretLikeText(line: string): string {
  const bounded =
    line.length > MAX_REDACTION_INPUT_LENGTH
      ? line.slice(0, MAX_REDACTION_INPUT_LENGTH)
      : line;

  return redactUrls(bounded)
    .replace(STELLAR_SECRET_STRKEY, REDACTED_PLACEHOLDER)
    .replace(BEARER_CREDENTIAL, `$1${REDACTED_PLACEHOLDER}`)
    .replace(SENSITIVE_ASSIGNMENT, `$1${REDACTED_PLACEHOLDER}`)
    .replace(TOKEN_LITERAL, REDACTED_PLACEHOLDER)
    .split(REDACTED_ASSIGNMENT_MARKER)
    .join('=');
}
