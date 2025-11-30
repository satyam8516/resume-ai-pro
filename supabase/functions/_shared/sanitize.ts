/**
 * Sanitizes a string to be JSON-safe by escaping problematic characters
 * that could cause "unsupported Unicode escape sequence" errors.
 * 
 * This handles:
 * - Raw backslashes (\ -> \\)
 * - Control characters (U+0000–U+001F, U+007F–U+009F) -> \uXXXX
 * - Malformed \u sequences
 * 
 * @param input - The string to sanitize
 * @returns A JSON-safe string
 */
export function sanitizeForJson(input: string): string {
  if (typeof input !== 'string') return input;
  
  // First, escape all backslashes
  let sanitized = input.replace(/\\/g, '\\\\');
  
  // Then, escape control characters to \uXXXX format
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, (ch) => {
    const code = ch.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
  
  return sanitized;
}

/**
 * Recursively sanitizes all string values in an object or array
 * @param obj - The object/array to sanitize
 * @returns The sanitized object/array
 */
export function sanitizeObjectForJson<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeForJson(obj) as T : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectForJson(item)) as T;
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeForJson(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObjectForJson(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}
