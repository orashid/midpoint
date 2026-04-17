import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform, Linking } from 'react-native';
import { apiPost, apiGet, setAuthToken, clearAuthToken } from '../api/client';

// Note: maybeCompleteAuthSession is called inside AuthProvider after Google
// auth completes, not at module level, to avoid interfering with Facebook auth.

const FACEBOOK_DISCOVERY = {
  authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
};

// These should match your registered OAuth client IDs
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
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

  // Google sign-in via expo-auth-session/providers/google — handles iOS/Android/web
  // redirect URIs automatically based on platform.
  const [googleRequest, , googlePromptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  // (Google debug logging removed — auth is working)

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
    console.log('[AUTH] Sending token to server, provider:', provider, 'tokenLength:', providerToken?.length);
    let data: any;
    try {
      data = await apiPost('/auth/login', { provider, token: providerToken });
      console.log('[AUTH] Server login success. User:', data?.user?.email);
    } catch (err: any) {
      console.log('[AUTH] Server login FAILED. Status:', err?.response?.status, 'Message:', err?.message, 'Data:', JSON.stringify(err?.response?.data));
      throw err;
    }
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
    console.log('[AUTH] signInWithGoogle invoked');
    const result = await googlePromptAsync();
    console.log('[AUTH] promptAsync result:', JSON.stringify(result, null, 2));
    if (result?.type === 'success') {
      const params = result.params as any;

      // Path 1: iOS implicit flow returns tokens directly
      const directIdToken =
        (result as any).authentication?.idToken || params.id_token;
      const directAccessToken =
        (result as any).authentication?.accessToken || params.access_token;

      if (directIdToken) {
        await handleLoginResponse('google', directIdToken);
        return;
      }
      if (directAccessToken) {
        await handleLoginResponse('google', directAccessToken);
        return;
      }

      // Path 2: Android code-flow with PKCE — exchange code for tokens
      const code = params.code;
      if (code && googleRequest) {
        console.log('[AUTH] Exchanging code for ID token');
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: googleRequest.clientId,
            code,
            redirectUri: googleRequest.redirectUri,
            extraParams: (googleRequest as any).codeVerifier
              ? { code_verifier: (googleRequest as any).codeVerifier }
              : {},
          },
          { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
        );
        console.log(
          '[AUTH] exchange response:',
          JSON.stringify(tokenResponse, null, 2)
        );

        const exchangedIdToken = (tokenResponse as any).idToken;
        const exchangedAccessToken = tokenResponse.accessToken;

        if (exchangedIdToken) {
          await handleLoginResponse('google', exchangedIdToken);
          return;
        }
        if (exchangedAccessToken) {
          await handleLoginResponse('google', exchangedAccessToken);
          return;
        }
      }

      throw new Error('Google sign-in returned no token');
    } else if (result?.type === 'error') {
      throw new Error(result.error?.message || 'Google sign-in failed');
    } else if (result?.type === 'cancel' || result?.type === 'dismiss') {
      // User cancelled — silent
      return;
    }
  }, [googlePromptAsync, googleRequest, handleLoginResponse]);

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
    console.log('[AUTH] signInWithFacebook invoked');
    const fbRedirectUri = 'https://midpoint-production-749a.up.railway.app/api/auth/facebook/callback';
    console.log('[AUTH] Facebook App ID:', FACEBOOK_APP_ID);
    console.log('[AUTH] Facebook redirectUri:', fbRedirectUri);

    const state = Math.random().toString(36).substring(7);
    const authUrl =
      `https://www.facebook.com/v18.0/dialog/oauth` +
      `?client_id=${FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(fbRedirectUri)}` +
      `&response_type=code` +
      `&scope=public_profile,email` +
      `&state=${state}`;

    console.log('[AUTH] Facebook authUrl:', authUrl);

    // Server redirects to midpoint://facebook-auth?code=... which is caught here
    const result = await WebBrowser.openAuthSessionAsync(authUrl, 'midpoint://facebook-auth');
    console.log('[AUTH] Facebook result:', JSON.stringify(result, null, 2));

    if (result.type === 'success' && result.url) {
      const queryString = result.url.split('?')[1];
      if (queryString) {
        const params = new URLSearchParams(queryString);
        const code = params.get('code');
        if (code) {
          console.log('[AUTH] Facebook code received, exchanging for token');
          const exchangeResult = await apiPost('/auth/facebook/exchange', {
            code,
            redirectUri: fbRedirectUri,
          });
          await handleLoginResponse('facebook', exchangeResult.accessToken);
          return;
        }
      }
      throw new Error('Facebook sign-in returned no code');
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      console.log('[AUTH] Facebook sign-in dismissed or cancelled');
    } else {
      throw new Error('Facebook sign-in failed');
    }
  }, [handleLoginResponse]);

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
