import {
  formatINR,
  formatDate,
  formatAttendancePercent,
  maskAadhaar,
  formatAcademicYear,
  formatFileSize,
} from '../formatters';

describe('formatINR', () => {
  test('formats whole numbers with currency symbol', () => {
    expect(formatINR(1500)).toBe('₹1,500.00');
  });

  test('formats decimal amounts', () => {
    expect(formatINR(1500.5)).toBe('₹1,500.50');
  });

  test('formats large amounts with Indian numbering', () => {
    expect(formatINR(100000)).toBe('₹1,00,000.00');
  });

  test('formats zero', () => {
    expect(formatINR(0)).toBe('₹0.00');
  });

  test('formats negative amounts', () => {
    expect(formatINR(-500)).toBe('-₹500.00');
  });
});

describe('maskAadhaar', () => {
  test('masks first 8 digits and shows last 4', () => {
    expect(maskAadhaar('123456789012')).toBe('XXXX-XXXX-9012');
  });

  test('handles Aadhaar with spaces', () => {
    expect(maskAadhaar('1234 5678 9012')).toBe('XXXX-XXXX-9012');
  });

  test('handles Aadhaar with dashes', () => {
    expect(maskAadhaar('1234-5678-9012')).toBe('XXXX-XXXX-9012');
  });

  test('returns original string if not 12 digits', () => {
    expect(maskAadhaar('12345')).toBe('12345');
  });
});

describe('formatDate', () => {
  test('formats ISO date string to readable form', () => {
    const result = formatDate('2026-01-15T00:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
  });
});

describe('formatAttendancePercent', () => {
  test('calculates correct percentage', () => {
    expect(formatAttendancePercent(18, 20)).toBe('90.0%');
  });

  test('returns 0% when total is 0', () => {
    expect(formatAttendancePercent(0, 0)).toBe('0%');
  });

  test('handles 100% attendance', () => {
    expect(formatAttendancePercent(20, 20)).toBe('100.0%');
  });
});

describe('formatAcademicYear', () => {
  test('shortens the second year', () => {
    expect(formatAcademicYear('2025-2026')).toBe('2025-26');
  });

  test('returns original for unexpected format', () => {
    expect(formatAcademicYear('2025')).toBe('2025');
  });
});

describe('formatFileSize', () => {
  test('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  test('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  test('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });
});
