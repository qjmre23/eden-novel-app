import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: 'AIzaSyB7nj-JWErRznJd0vxeV_LUAKezbJACFME',
  authDomain: 'eden-novel.firebaseapp.com',
  projectId: 'eden-novel',
  storageBucket: 'eden-novel.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef1234567890',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

interface AuthContextValue {
  user: User | null;
  isGuest: boolean;
  cloudSyncEnabled: boolean;
  authReady: boolean;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  lastSyncedAt: number | null;
  setLastSyncedAt: (ts: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    const stored = localStorage.getItem('eden_last_synced_at');
    return stored ? Number(stored) : null;
  });

  useEffect(() => {
    const guestMode = localStorage.getItem('eden_guest_mode') === 'true';
    if (guestMode) {
      setIsGuest(true);
      setAuthReady(true);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsGuest(false);
        localStorage.removeItem('eden_guest_mode');
      }
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    if (Capacitor.isNativePlatform()) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem('eden_guest_mode', 'true');
    setIsGuest(true);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    localStorage.removeItem('eden_guest_mode');
    setIsGuest(false);
    setUser(null);
  }, []);

  const handleSetLastSyncedAt = useCallback((ts: number) => {
    setLastSyncedAt(ts);
    localStorage.setItem('eden_last_synced_at', String(ts));
  }, []);

  const cloudSyncEnabled = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        cloudSyncEnabled,
        authReady,
        signInWithGoogle,
        continueAsGuest,
        logout,
        lastSyncedAt,
        setLastSyncedAt: handleSetLastSyncedAt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
