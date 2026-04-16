import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiPost, apiGet, setAuthToken, clearAuthToken } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

// OAuth discovery documents
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const FACEBOOK_DISCOVERY = {
  authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
};

// These should match your registered OAuth client IDs
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';

const TOKEN_KEY = 'midpoint_auth_token';
const USER_KEY = 'midpoint_auth_user';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithFacebook: async () => {},
  signOut: async () => {},
  token: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (savedToken) {
          setAuthToken(savedToken);
          // Validate token with server
          const userData = await apiGet('/auth/me');
          if (mountedRef.current) {
            setToken(savedToken);
            setUser({
              id: userData.id,
              email: userData.email,
              displayName: userData.displayName,
              avatarUrl: userData.avatarUrl,
              provider: userData.provider,
            });
          }
        }
      } catch {
        // Token expired or invalid — clear it
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        clearAuthToken();
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();
  }, []);

  const handleLoginResponse = useCallback(async (provider: string, providerToken: string) => {
    const data = await apiPost('/auth/login', { provider, token: providerToken });
    const midpointToken = data.token;

    // Store securely
    await SecureStore.setItemAsync(TOKEN_KEY, midpointToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    setAuthToken(midpointToken);

    if (mountedRef.current) {
      setToken(midpointToken);
      setUser({
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        avatarUrl: data.user.avatarUrl,
        provider,
      });
    }
  }, []);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'midpoint' });

  // ── Google Sign-In ──
  const signInWithGoogle = useCallback(async () => {
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
    });

    const result = await request.promptAsync(GOOGLE_DISCOVERY as AuthSession.DiscoveryDocument);
    if (result.type === 'success' && result.params.id_token) {
      await handleLoginResponse('google', result.params.id_token);
    } else if (result.type === 'error') {
      throw new Error(result.error?.message || 'Google sign-in failed');
    }
  }, [handleLoginResponse, redirectUri]);

  // ── Apple Sign-In ──
  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
    });
    if (credential.identityToken) {
      await handleLoginResponse('apple', credential.identityToken);
    } else {
      throw new Error('Apple sign-in failed: no identity token');
    }
  }, [handleLoginResponse]);

  // ── Facebook Sign-In ──
  const signInWithFacebook = useCallback(async () => {
    const request = new AuthSession.AuthRequest({
      clientId: FACEBOOK_APP_ID,
      scopes: ['public_profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
    });

    const result = await request.promptAsync(FACEBOOK_DISCOVERY as AuthSession.DiscoveryDocument);
    if (result.type === 'success' && result.params.access_token) {
      await handleLoginResponse('facebook', result.params.access_token);
    } else if (result.type === 'error') {
      throw new Error(result.error?.message || 'Facebook sign-in failed');
    }
  }, [handleLoginResponse, redirectUri]);

  // ── Sign Out ──
  const signOut = useCallback(async () => {
    try {
      await apiPost('/auth/logout', {});
    } catch {
      // Ignore — server logout is best-effort
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    clearAuthToken();
    if (mountedRef.current) {
      setToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && !!token,
        signInWithGoogle,
        signInWithApple,
        signInWithFacebook,
        signOut,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
