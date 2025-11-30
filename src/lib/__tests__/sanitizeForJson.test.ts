import { describe, it, expect } from 'vitest';
import { sanitizeForJson, sanitizeObjectForJson } from '../sanitizeForJson';

describe('sanitizeForJson', () => {
  describe('malformed Unicode escape sequences', () => {
    it('should handle malformed \\u sequences without 4 hex digits', () => {
      expect(sanitizeForJson('\\uZZZZ')).toBe('\\\\uZZZZ');
      expect(sanitizeForJson('\\u123')).toBe('\\\\u123'); // only 3 digits
      expect(sanitizeForJson('\\u12345')).toBe('\\\\u12345'); // 5 digits
      expect(sanitizeForJson('\\uGGGG')).toBe('\\\\uGGGG');
    });

    it('should preserve valid \\uXXXX sequences', () => {
      expect(sanitizeForJson('\\u0041')).toBe('\\\\u0041'); // Letter A
      expect(sanitizeForJson('\\u00E9')).toBe('\\\\u00E9'); // é
      expect(sanitizeForJson('\\u4E2D')).toBe('\\\\u4E2D'); // 中
    });

    it('should handle mixed valid and invalid sequences', () => {
      const input = '\\u0041 valid \\uZZZZ invalid';
      const result = sanitizeForJson(input);
      expect(result).toBe('\\\\u0041 valid \\\\uZZZZ invalid');
    });
  });

  describe('backslash escaping', () => {
    it('should escape single backslashes', () => {
      expect(sanitizeForJson('C:\\Users\\test')).toBe('C:\\\\Users\\\\test');
      expect(sanitizeForJson('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should handle multiple consecutive backslashes', () => {
      expect(sanitizeForJson('\\\\')).toBe('\\\\\\\\');
      expect(sanitizeForJson('\\\\\\\\')).toBe('\\\\\\\\\\\\\\\\');
    });

    it('should handle backslashes at start and end', () => {
      expect(sanitizeForJson('\\start')).toBe('\\\\start');
      expect(sanitizeForJson('end\\')).toBe('end\\\\');
      expect(sanitizeForJson('\\both\\')).toBe('\\\\both\\\\');
    });
  });

  describe('control characters', () => {
    it('should escape null bytes', () => {
      expect(sanitizeForJson('before\u0000after')).toBe('before\\u0000after');
    });

    it('should escape newlines and tabs', () => {
      expect(sanitizeForJson('line1\nline2')).toBe('line1\\u000aline2');
      expect(sanitizeForJson('tab\there')).toBe('tab\\u0009here');
      expect(sanitizeForJson('return\rhere')).toBe('return\\u000dhere');
    });

    it('should escape all C0 control characters (U+0000 to U+001F)', () => {
      const input = '\x00\x01\x02\x1F'; // null, SOH, STX, unit separator
      const result = sanitizeForJson(input);
      expect(result).toContain('\\u0000');
      expect(result).toContain('\\u0001');
      expect(result).toContain('\\u0002');
      expect(result).toContain('\\u001f');
    });

    it('should escape DEL and C1 control characters (U+007F to U+009F)', () => {
      const input = '\x7F\x80\x9F'; // DEL, PAD, APC
      const result = sanitizeForJson(input);
      expect(result).toContain('\\u007f');
      expect(result).toContain('\\u0080');
      expect(result).toContain('\\u009f');
    });
  });

  describe('multi-byte UTF-8 characters', () => {
    it('should preserve emojis', () => {
      expect(sanitizeForJson('Hello 👋 World 🌍')).toBe('Hello 👋 World 🌍');
      expect(sanitizeForJson('🎉🎊🎈')).toBe('🎉🎊🎈');
    });

    it('should preserve CJK characters', () => {
      expect(sanitizeForJson('你好世界')).toBe('你好世界'); // Chinese
      expect(sanitizeForJson('こんにちは')).toBe('こんにちは'); // Japanese
      expect(sanitizeForJson('안녕하세요')).toBe('안녕하세요'); // Korean
    });

    it('should preserve accented characters', () => {
      expect(sanitizeForJson('café résumé naïve')).toBe('café résumé naïve');
      expect(sanitizeForJson('Ñoño')).toBe('Ñoño');
    });

    it('should preserve mathematical symbols', () => {
      expect(sanitizeForJson('∑∫∂√π')).toBe('∑∫∂√π');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(sanitizeForJson('')).toBe('');
    });

    it('should handle strings with only whitespace', () => {
      expect(sanitizeForJson('   ')).toBe('   ');
      expect(sanitizeForJson('\t  \t')).toBe('\\u0009  \\u0009'); // tabs are control chars
    });

    it('should handle non-string inputs gracefully', () => {
      expect(sanitizeForJson(null as any)).toBe(null);
      expect(sanitizeForJson(undefined as any)).toBe(undefined);
      expect(sanitizeForJson(123 as any)).toBe(123);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000) + '\\uZZZZ' + 'b'.repeat(10000);
      const result = sanitizeForJson(longString);
      expect(result).toContain('\\\\uZZZZ');
      expect(result.length).toBeGreaterThan(20000);
    });
  });

  describe('real-world resume scenarios', () => {
    it('should handle resume with file paths', () => {
      const resume = 'Worked on C:\\Projects\\App and \\\\network\\share';
      const result = sanitizeForJson(resume);
      expect(result).toBe('Worked on C:\\\\Projects\\\\App and \\\\\\\\network\\\\share');
    });

    it('should handle resume with special formatting', () => {
      const resume = 'Skills: C++, .NET\\nExperience: 5+ years\\tSenior Developer';
      const result = sanitizeForJson(resume);
      expect(result).toContain('\\u000a'); // newline
      expect(result).toContain('\\u0009'); // tab
    });

    it('should handle resume with international names', () => {
      const resume = 'José García • Björk Guðmundsdóttir • 王小明';
      const result = sanitizeForJson(resume);
      // Should preserve all international characters
      expect(result).toContain('José');
      expect(result).toContain('Björk');
      expect(result).toContain('王小明');
    });

    it('should handle resume with malformed Unicode from PDF extraction', () => {
      const resume = 'Name: John\\uDoeExperience: \\u123Skills: JavaScript';
      const result = sanitizeForJson(resume);
      expect(result).toBe('Name: John\\\\uDoeExperience: \\\\u123Skills: JavaScript');
    });
  });
});

describe('sanitizeObjectForJson', () => {
  it('should sanitize string properties in objects', () => {
    const obj = {
      name: 'Test\\uZZZZ',
      path: 'C:\\Users\\test'
    };
    const result = sanitizeObjectForJson(obj);
    expect(result.name).toBe('Test\\\\uZZZZ');
    expect(result.path).toBe('C:\\\\Users\\\\test');
  });

  it('should handle nested objects', () => {
    const obj = {
      user: {
        name: 'Test\\uZZZZ',
        details: {
          address: 'C:\\Users\\test'
        }
      }
    };
    const result = sanitizeObjectForJson(obj);
    expect(result.user.name).toBe('Test\\\\uZZZZ');
    expect(result.user.details.address).toBe('C:\\\\Users\\\\test');
  });

  it('should handle arrays', () => {
    const obj = {
      skills: ['C++', 'Python\\nAdvanced', 'Java\\uZZZZ']
    };
    const result = sanitizeObjectForJson(obj);
    expect(result.skills[0]).toBe('C++');
    expect(result.skills[1]).toContain('\\u000a');
    expect(result.skills[2]).toBe('Java\\\\uZZZZ');
  });

  it('should preserve non-string values', () => {
    const obj = {
      name: 'Test\\uZZZZ',
      age: 25,
      active: true,
      score: null,
      metadata: undefined
    };
    const result = sanitizeObjectForJson(obj);
    expect(result.name).toBe('Test\\\\uZZZZ');
    expect(result.age).toBe(25);
    expect(result.active).toBe(true);
    expect(result.score).toBe(null);
    expect(result.metadata).toBe(undefined);
  });

  it('should handle complex resume data structure', () => {
    const resume = {
      name: 'José\\uZZZZ García',
      email: 'jose@example.com',
      experience: [
        {
          company: 'Tech Corp',
          title: 'Senior\\nDeveloper',
          bullets: ['Built C:\\Projects\\App', 'Used C++\\tand Python']
        }
      ],
      skills: ['JavaScript', 'TypeScript\\uABC']
    };
    const result = sanitizeObjectForJson(resume);
    expect(result.name).toBe('José\\\\uZZZZ García');
    expect(result.experience[0].title).toContain('\\u000a');
    expect(result.experience[0].bullets[0]).toContain('C:\\\\Projects\\\\App');
    expect(result.experience[0].bullets[1]).toContain('\\u0009');
    expect(result.skills[1]).toBe('TypeScript\\\\uABC');
  });
});
