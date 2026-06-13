import {
  isValidPhone,
  isValidEmail,
  isValidAadhaar,
  isValidPAN,
  isValidPincode,
} from '../validators';

describe('isValidPhone', () => {
  test('validates a correct 10-digit mobile number', () => {
    expect(isValidPhone('9876543210')).toBe(true);
  });

  test('validates with +91 prefix', () => {
    expect(isValidPhone('+919876543210')).toBe(true);
  });

  test('rejects numbers starting with 0-5', () => {
    expect(isValidPhone('1234567890')).toBe(false);
  });

  test('rejects numbers with fewer than 10 digits', () => {
    expect(isValidPhone('98765432')).toBe(false);
  });
});

describe('isValidEmail', () => {
  test('validates a correct email', () => {
    expect(isValidEmail('teacher@school.edu.in')).toBe(true);
  });

  test('rejects email without @', () => {
    expect(isValidEmail('invalidemailaddress')).toBe(false);
  });

  test('rejects email without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });
});

describe('isValidAadhaar', () => {
  test('validates a correct 12-digit Aadhaar', () => {
    expect(isValidAadhaar('234567890123')).toBe(true);
  });

  test('rejects Aadhaar starting with 0', () => {
    expect(isValidAadhaar('012345678901')).toBe(false);
  });

  test('rejects Aadhaar with fewer than 12 digits', () => {
    expect(isValidAadhaar('12345678')).toBe(false);
  });

  test('validates with spaces', () => {
    expect(isValidAadhaar('2345 6789 0123')).toBe(true);
  });
});

describe('isValidPAN', () => {
  test('validates a correct PAN', () => {
    expect(isValidPAN('ABCDE1234F')).toBe(true);
  });

  test('rejects incorrect PAN format', () => {
    expect(isValidPAN('1BCDE1234F')).toBe(false);
  });
});

describe('isValidPincode', () => {
  test('validates a correct 6-digit pincode', () => {
    expect(isValidPincode('110001')).toBe(true);
  });

  test('rejects pincode starting with 0', () => {
    expect(isValidPincode('010001')).toBe(false);
  });

  test('rejects 5-digit pincode', () => {
    expect(isValidPincode('11000')).toBe(false);
  });
});
