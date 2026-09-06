import { NextResponse } from "next/server";

export type SecurityEventType =
  | "AUTH_FAILURE"
  | "ACCESS_DENIED"
  | "RATE_LIMIT_EXCEEDED"
  | "SSRF_ATTEMPT"
  | "INVALID_INPUT"
  | "MALICIOUS_UPLOAD_BLOCKED"
  | "PRIVILEGE_ESCALATION_ATTEMPT";

export interface SecurityEventData {
  event: SecurityEventType;
  userId?: string;
  userEmail?: string;
  ip?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export function logSecurityEvent(event: SecurityEventData) {
  const timestamp = new Date().toISOString();
  // Safe logging: structured JSON without secrets or sensitive content
  const payload = {
    timestamp,
    level: "SECURITY_AUDIT",
    ...event,
  };
  console.warn(`[SECURITY AUDIT] ${JSON.stringify(payload)}`);
}

/**
 * Creates an error response for API routes that does not leak internal stack
 * traces, MongoDB query structures, or filesystem paths to the client in production.
 */
export function createSafeErrorResponse(
  err: unknown,
  fallbackMessage = "An unexpected error occurred",
  status = 500
): NextResponse {
  const isDev = process.env.NODE_ENV !== "production";
  const errorMessage = err instanceof Error ? err.message : String(err);

  // Always log the full stack and error internally on the server
  console.error(`[API Error ${status}]:`, err);

  // In production, never leak sensitive system details or MongoDB errors
  let safeMessage = fallbackMessage;
  if (isDev) {
    safeMessage = errorMessage || fallbackMessage;
  } else if (status < 500) {
    // 4xx errors are client-facing validation errors; safe to display sanitized message
    safeMessage = errorMessage.replace(/(mongodb|mongoose|\/.*\/|\\.*\\)/gi, "").trim() || fallbackMessage;
  }

  return NextResponse.json({ error: safeMessage }, { status });
}
