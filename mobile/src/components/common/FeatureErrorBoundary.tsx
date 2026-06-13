import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  featureName: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    Sentry.withScope((scope) => {
      scope.setTag('feature', this.props.featureName);
      scope.setExtra('componentStack', info.componentStack);
      Sentry.captureException(error);
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Feather name="alert-circle" size={40} color="#dc2626" />
          <Text className="text-base font-semibold text-gray-900 mt-4 text-center">
            {this.props.featureName} failed to load
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-2">
            We've been notified. Please try again.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            className="mt-6 px-6 py-3 rounded-xl bg-blue-600"
          >
            <Text className="text-sm font-semibold text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
