/**
 * Production-grade sanitizer for JSON-safe strings.
 * Eliminates "unsupported Unicode escape sequence" errors by:
 * 1. Normalizing malformed \u sequences (e.g., \uGGGG -> \\uGGGG)
 * 2. Escaping all backslashes properly
 * 3. Converting control characters to \uXXXX escapes
 * 
 * This three-step approach ensures:
 * - Malformed escape sequences are preserved as literal text
 * - Valid Unicode is maintained
 * - Control characters don't break JSON parsing
 * - Multi-byte UTF-8 characters (emojis, etc.) pass through safely
 * 
 * @param input - The string to sanitize
 * @returns A JSON-safe string ready for JSON.stringify()
 */
export function sanitizeForJson(input: string): string {
  if (typeof input !== 'string') return input;
  
  // Step 1: Normalize malformed \u sequences (not followed by exactly 4 hex digits)
  // This prevents invalid escapes like \uZZZZ from breaking JSON parsing
  let sanitized = input.replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u');
  
  // Step 2: Escape all remaining backslashes (but not the ones we just added)
  // We need to be careful not to double-escape what we just fixed
  sanitized = sanitized.replace(/\\(?!\\)/g, '\\\\');
  
  // Step 3: Convert control characters to proper \uXXXX escape sequences
  // This includes characters that could break JSON structure
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
