import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary. Any React render error anywhere in the tree
 * falls here instead of showing a red screen / white screen of death.
 * User sees a friendly fallback with a "Try again" button.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In a production build, wire this to a crash reporter (Sentry/Bugsnag)
    // For now, log so we can see it in dev tools.
    console.error('[AppErrorBoundary]', error, errorInfo.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            Midpoint ran into an unexpected problem. Tap below to try again.
          </Text>
          {this.state.error?.message ? (
            <Text style={styles.details} numberOfLines={3}>
              {this.state.error.message}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.reset} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  details: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: 'Courier',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    color: colors.textOnPrimary ?? '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
