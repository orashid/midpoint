import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';

export function SignInScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: string, signInFn: () => Promise<void>) => {
    console.log('[SIGNIN] handleSignIn called for provider:', provider);
    setLoading(provider);
    try {
      await signInFn();
    } catch (err: any) {
      console.log('[SIGNIN] Error for provider:', provider, err.message);
      Alert.alert('Sign In Failed', err.message || 'Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo / Branding */}
        <View style={styles.branding}>
          <View style={styles.iconCircle}>
            <Ionicons name="location" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Midpoint</Text>
          <Text style={styles.subtitle}>Find a fair spot to meet in the middle</Text>
        </View>

        {/* Sign In Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btn, styles.googleBtn]}
            onPress={() => handleSignIn('google', signInWithGoogle)}
            disabled={loading !== null}
          >
            {loading === 'google' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.btnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.btn, styles.appleBtn]}
              onPress={() => handleSignIn('apple', signInWithApple)}
              disabled={loading !== null}
            >
              {loading === 'apple' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#fff" />
                  <Text style={styles.btnText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  buttons: {
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: 10,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  googleBtn: {
    backgroundColor: '#4285F4',
  },
  appleBtn: {
    backgroundColor: '#000',
  },
  terms: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
