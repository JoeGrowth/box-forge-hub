// Sanitize backend errors before showing them to end users.
// Keeps details in the console for developers, returns a friendly message to the UI.
export function sanitizeError(error: unknown): string {
  // Always log the full error for developers.
  // eslint-disable-next-line no-console
  console.error("Sanitized error:", error);

  const knownErrors: Record<string, string> = {
    "23505": "This item already exists.",
    "23503": "Cannot complete this action because it is linked to other data.",
    "23502": "Some required information is missing.",
    "23514": "The submitted value is not allowed.",
    "42501": "You do not have permission to perform this action.",
    "42P01": "Requested resource is unavailable.",
    PGRST116: "No matching data found.",
    PGRST301: "You do not have permission to perform this action.",
  };

  const err = (error ?? {}) as {
    code?: string;
    error_code?: string;
    status?: number;
    message?: string;
    name?: string;
  };

  const code = err.code || err.error_code;
  if (code && knownErrors[code]) return knownErrors[code];

  if (err.status === 401 || err.status === 403) {
    return "You do not have permission to perform this action.";
  }
  if (err.status === 429) {
    return "Too many requests. Please slow down and try again.";
  }
  if (err.status && err.status >= 500) {
    return "The service is temporarily unavailable. Please try again shortly.";
  }

  return "Something went wrong. Please try again or contact support.";
}
