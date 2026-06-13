/**
 * performance.ts unit tests.
 *
 * All Sentry mocks use jest.fn() inline in the factory (no outer variable
 * references that would be in the temporal dead zone when Jest hoists the mock).
 */

jest.mock('@sentry/react-native', () => ({
  startInactiveSpan: jest.fn(),
  captureMessage: jest.fn(),
}));

import { measureScreenLoad } from '../performance';

function getSentryMocks() {
  return jest.requireMock('@sentry/react-native') as {
    startInactiveSpan: jest.Mock;
    captureMessage: jest.Mock;
  };
}

describe('measureScreenLoad', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const s = getSentryMocks();
    s.startInactiveSpan.mockReturnValue({ end: jest.fn() });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a Sentry inactive span with the screen name', () => {
    measureScreenLoad('parent_dashboard');
    expect(getSentryMocks().startInactiveSpan).toHaveBeenCalledWith({
      name: 'screen_load_parent_dashboard',
      op: 'ui.load',
    });
  });

  it('returns a complete() function', () => {
    const handle = measureScreenLoad('test_screen');
    expect(typeof handle.complete).toBe('function');
  });

  it('calls span.end() when complete() is invoked', () => {
    const mockEnd = jest.fn();
    getSentryMocks().startInactiveSpan.mockReturnValueOnce({ end: mockEnd });
    const handle = measureScreenLoad('attendance');
    handle.complete();
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it('does NOT capture a Sentry warning for fast screens (< 2000 ms)', () => {
    const handle = measureScreenLoad('fast_screen');
    jest.advanceTimersByTime(500);
    handle.complete();
    expect(getSentryMocks().captureMessage).not.toHaveBeenCalled();
  });

  it('captures a Sentry warning for slow screens (> 2000 ms)', () => {
    const handle = measureScreenLoad('slow_screen');
    jest.advanceTimersByTime(3000);
    handle.complete();
    expect(getSentryMocks().captureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Slow screen load: slow_screen'),
      'warning',
    );
  });

  it('includes the duration in the slow screen warning', () => {
    const handle = measureScreenLoad('marks_entry');
    jest.advanceTimersByTime(2500);
    handle.complete();
    const callArg = getSentryMocks().captureMessage.mock.calls[0][0] as string;
    expect(callArg).toContain('ms');
  });

  it('does not throw when span is null (Sentry not initialised)', () => {
    getSentryMocks().startInactiveSpan.mockReturnValueOnce(null);
    const handle = measureScreenLoad('uninit_screen');
    expect(() => handle.complete()).not.toThrow();
  });

  it('SLOW_SCREEN_THRESHOLD_MS boundary = 2000 ms (regression guard)', () => {
    const handle1 = measureScreenLoad('boundary_screen');
    jest.advanceTimersByTime(1999);
    handle1.complete();
    expect(getSentryMocks().captureMessage).not.toHaveBeenCalled();

    jest.clearAllMocks();
    getSentryMocks().startInactiveSpan.mockReturnValue({ end: jest.fn() });

    const handle2 = measureScreenLoad('boundary_screen_2');
    jest.advanceTimersByTime(2001);
    handle2.complete();
    expect(getSentryMocks().captureMessage).toHaveBeenCalled();
  });
});
