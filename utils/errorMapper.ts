// utils/errorMapper.ts

export class AppError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'AppError';
  }
}

/**
 * Converts any error thrown during a search call into a friendly AppError.
 */
export function mapSearchError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // Firebase Functions errors have a `code` property.
  if (isFirebaseFunctionsError(error)) {
    const message = messageForFunctionsCode(error.code);
    return new AppError(message, error.code);
  }

  // Network errors (e.g., no internet connection)
  if (isNetworkError(error)) {
    return new AppError(
      "You're offline. Check your connection and try again.",
      'network-error'
    );
  }

  // Fallback
  return new AppError(
    'Something went wrong. Please try again.',
    'unknown'
  );
}

function isFirebaseFunctionsError(error: unknown): error is { code: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const msg = (error as any).message?.toLowerCase() || '';
  return msg.includes('network') || msg.includes('offline') || msg.includes('fetch');
}

function messageForFunctionsCode(code: string): string {
  switch (code) {
    case 'invalid-argument':
      return "We couldn't understand that search. Please try adjusting your filters.";
    case 'unauthenticated':
      return 'Please sign in to search for services.';
    case 'permission-denied':
      return "You don't have permission to do that.";
    case 'resource-exhausted':
      return "You're searching a bit too fast. Please wait a moment and try again.";
    case 'unavailable':
      return "You're offline. Check your connection and try again.";
    case 'deadline-exceeded':
      return "That's taking longer than expected. Please try again.";
    case 'internal':
    default:
      return "We couldn't complete your search right now. Please try again.";
  }
}

/**
 * Converts location‑related errors into friendly AppErrors.
 */
export function mapLocationError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const msg = (error as any)?.message?.toLowerCase() || '';

  if (msg.includes('location services are disabled')) {
    return new AppError(
      'Turn on location services to find providers near you.',
      'location-service-disabled'
    );
  }

  if (msg.includes('location permission')) {
    return new AppError(
      'Location access is needed to search nearby. Please allow it and try again.',
      'location-permission-denied'
    );
  }

  if (msg.includes('timeout')) {
    return new AppError(
      "We couldn't get your location in time. Please try again.",
      'location-timeout'
    );
  }

  return new AppError(
    "We couldn't get your location. Please try again.",
    'location-unknown'
  );
}