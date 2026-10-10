import * as crypto from 'crypto';

/**
 * Generate a unique, traceable request ID for developer API telemetry.
 * Example: req_1a2b3c4d5e6f
 */
export function generateRequestId(): string {
  const bytes = crypto.randomBytes(8).toString('hex');
  return `req_${bytes}`;
}
