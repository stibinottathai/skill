"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const ALLOWED_EMAIL = "stibinaugustine3047@gmail.com";

  useEffect(() => {
    // Safety fallback timeout to prevent infinite loading state if Firebase Auth hangs
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        clearTimeout(timeout);
        try {
          if (currentUser && currentUser.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
            // Force sign out immediately
            await signOut(auth);
            setUser(null);
          } else {
            setUser(currentUser);
          }
        } catch (err) {
          console.error("Error in auth state change:", err);
          setUser(null);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        clearTimeout(timeout);
        console.error("Firebase auth listener error:", error);
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const email = userCredential.user.email;
      if (email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
        await signOut(auth);
        throw new Error("Unauthorized account. This application is restricted to the administrator only.");
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
