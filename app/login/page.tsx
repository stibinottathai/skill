"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await loginWithGoogle();
      router.replace("/dashboard");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong during sign in. Please try again.");
      setSigningIn(false);
    }
  };

  // If initial auth check is loading, show a blank page or spinner
  if (loading && !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
      </div>
    );
  }

  // If already logged in and redirecting, render loading state
  if (user) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans overflow-hidden transition-colors duration-300">
      {/* Background Ambient Blur Gradients */}
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/5 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[60%] w-[60%] rounded-full bg-violet-500/10 blur-[120px] dark:bg-violet-500/5 pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-md p-6 sm:p-8 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl m-4 transition-all duration-300">
        <div className="flex flex-col items-center text-center gap-6">
          
          {/* Logo Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-6 w-6" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              Skill Tracker
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[280px] mx-auto">
              Sign in to manage and log your personal learning progress.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg bg-red-50 p-3 text-left text-xs text-red-700 dark:bg-red-950/20 dark:text-red-400 w-full border border-red-200 dark:border-red-900/50">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="group flex w-full items-center justify-center gap-3 h-12 px-5 rounded-xl border border-zinc-200 bg-white text-zinc-900 font-medium transition-all duration-200 hover:bg-zinc-50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
          >
            {signingIn ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-800 border-t-transparent dark:border-zinc-200" />
            ) : (
              // Google SVG Logo Icon
              <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path
                    d="M21.35,11.1H12v2.7h5.38C16.88,16.55,14.86,18,12,18c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.55,0,2.95,0.59,4,1.56l2-2C18.15,3.75,15.27,3,12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9c4.78,0,8.22-3.32,8.9-8H21.35z"
                    fill="#4285F4"
                    className="group-hover:opacity-90 transition-opacity"
                  />
                  <path
                    d="M12,21c4.78,0,8.22-3.32,8.9-8h-8.9v2.7h5.38C16.88,16.55,14.86,18,12,18v3z"
                    fill="#34A853"
                  />
                  <path
                    d="M20.9,13c0.07-0.33,0.1-0.66,0.1-1H12v2.7h5.38C16.88,16.55,14.86,18,12,18c-2.86,0-4.88-1.45-5.38-4.2H20.9z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12,3c-4.97,0-9,4.03-9,9h6c0-3.31,2.69-6,6-6c1.55,0,2.95,0.59,4,1.56l2-2C18.15,3.75,15.27,3,12,3z"
                    fill="#EA4335"
                  />
                </g>
              </svg>
            )}
            <span>{signingIn ? "Signing in..." : "Continue with Google"}</span>
          </button>

          {/* Privacy Note */}
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            This is a private instance of Skill Tracker. Only authorized Google accounts may access and retrieve dashboard information.
          </p>

        </div>
      </div>
    </div>
  );
}
