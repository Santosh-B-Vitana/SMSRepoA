import { sanitize, getAmountBucket } from '../analytics';

jest.mock('@amplitude/analytics-react-native', () => ({
  init: jest.fn(),
  track: jest.fn(),
  setUserId: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  Identify: jest.fn().mockImplementation(() => ({ set: jest.fn() })),
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
}));

describe('sanitize', () => {
  it('removes forbidden keys (name, email, phone)', () => {
    const result = sanitize({ name: 'Aarav', role: 'Student', email: 'a@b.com' });
    expect(result).toEqual({ role: 'Student' });
    expect(result.name).toBeUndefined();
    expect(result.email).toBeUndefined();
  });

  it('removes aadhaar and pan fields', () => {
    const result = sanitize({ aadhaar: '1234', pan: 'ABCDE1234F', school_id: 'abc' });
    expect(result).toEqual({ school_id: 'abc' });
  });

  it('removes password and token fields', () => {
    const result = sanitize({ password: 'secret', token: 'jwt', refreshToken: 'rt' });
    expect(result).toEqual({});
  });

  it('removes keys that contain forbidden substrings (case-insensitive)', () => {
    const result = sanitize({ userName: 'Priya', phoneNumber: '9876', role: 'Parent' });
    expect(result).toEqual({ role: 'Parent' });
    expect(result.userName).toBeUndefined();
    expect(result.phoneNumber).toBeUndefined();
  });

  it('keeps allowed keys untouched', () => {
    const result = sanitize({
      role: 'Parent',
      schoolId: 'abc123',
      was_offline: true,
      class_size: 30,
      amount_bucket: '<5k',
    });
    expect(result).toEqual({
      role: 'Parent',
      schoolId: 'abc123',
      was_offline: true,
      class_size: 30,
      amount_bucket: '<5k',
    });
  });

  it('returns empty object for undefined input', () => {
    expect(sanitize(undefined)).toEqual({});
  });

  it('returns empty object for empty input', () => {
    expect(sanitize({})).toEqual({});
  });
});

describe('getAmountBucket', () => {
  it('returns <5k for amounts below 5000', () => {
    expect(getAmountBucket(0)).toBe('<5k');
    expect(getAmountBucket(3000)).toBe('<5k');
    expect(getAmountBucket(4999)).toBe('<5k');
  });

  it('returns 5k-20k for amounts 5000–19999', () => {
    expect(getAmountBucket(5000)).toBe('5k-20k');
    expect(getAmountBucket(10000)).toBe('5k-20k');
    expect(getAmountBucket(19999)).toBe('5k-20k');
  });

  it('returns 20k-50k for amounts 20000–49999', () => {
    expect(getAmountBucket(20000)).toBe('20k-50k');
    expect(getAmountBucket(30000)).toBe('20k-50k');
    expect(getAmountBucket(49999)).toBe('20k-50k');
  });

  it('returns >50k for amounts 50000 and above', () => {
    expect(getAmountBucket(50000)).toBe('>50k');
    expect(getAmountBucket(100000)).toBe('>50k');
  });
});
