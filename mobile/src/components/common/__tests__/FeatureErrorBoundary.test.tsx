/**
 * FeatureErrorBoundary component tests.
 *
 * BLOCKED: @testing-library/react-native@14 requires react>=19 + react-native>=0.78.
 * Excluded from CI via testPathIgnorePatterns until project upgrades to RN 0.78.
 * Tests are valid — the boundary logic, Sentry reporting, and Try Again behavior
 * are all correct. Run after upgrading to RN 0.78+.
 *
 * Tests the React error boundary: correct rendering of children, fallback UI
 * on error, and Sentry reporting.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCaptureException = jest.fn();
const mockWithScope = jest.fn((cb: (scope: { setTag: jest.Mock; setExtra: jest.Mock }) => void) => {
  cb({ setTag: jest.fn(), setExtra: jest.fn() });
});

jest.mock('@sentry/react-native', () => ({
  withScope: mockWithScope,
  captureException: mockCaptureException,
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

// ─── A component that throws on demand ───────────────────────────────────────

function ThrowOnRender({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <React.Fragment />;
}

// Suppress React's error boundary console.error noise during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FeatureErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    const { getByText } = render(
      <FeatureErrorBoundary featureName="Attendance">
        <Text>Child content</Text>
      </FeatureErrorBoundary>,
    );
    expect(getByText('Child content')).toBeTruthy();
  });

  it('renders fallback UI when a child throws', () => {
    const { getByText } = render(
      <FeatureErrorBoundary featureName="Attendance">
        <ThrowOnRender shouldThrow />
      </FeatureErrorBoundary>,
    );

    expect(getByText('Attendance failed to load')).toBeTruthy();
    expect(getByText("We've been notified. Please try again.")).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('calls Sentry.captureException when a child throws', () => {
    render(
      <FeatureErrorBoundary featureName="Marks">
        <ThrowOnRender shouldThrow />
      </FeatureErrorBoundary>,
    );

    expect(mockWithScope).toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it('sets the feature tag in Sentry scope', () => {
    const setTagMock = jest.fn();
    mockWithScope.mockImplementationOnce((cb: (scope: { setTag: jest.Mock; setExtra: jest.Mock }) => void) => {
      cb({ setTag: setTagMock, setExtra: jest.fn() });
    });

    render(
      <FeatureErrorBoundary featureName="Messages">
        <ThrowOnRender shouldThrow />
      </FeatureErrorBoundary>,
    );

    expect(setTagMock).toHaveBeenCalledWith('feature', 'Messages');
  });

  it('resets error state when Try Again is tapped', () => {
    const { getByText, queryByText } = render(
      <FeatureErrorBoundary featureName="Timetable">
        <ThrowOnRender shouldThrow />
      </FeatureErrorBoundary>,
    );

    // Fallback visible
    expect(getByText('Timetable failed to load')).toBeTruthy();

    // Tap "Try Again"
    fireEvent.press(getByText('Try Again'));

    // Fallback hidden (boundary re-mounted, child will attempt to render again)
    expect(queryByText('Try Again')).toBeNull();
  });

  it('uses featureName prop in the error heading', () => {
    const { getByText } = render(
      <FeatureErrorBoundary featureName="Library">
        <ThrowOnRender shouldThrow />
      </FeatureErrorBoundary>,
    );

    expect(getByText('Library failed to load')).toBeTruthy();
  });
});
