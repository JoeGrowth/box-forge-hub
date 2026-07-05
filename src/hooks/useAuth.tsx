import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "entrepreneur" | "cobuilder" | "box_manager" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Synchronously hydrate session from localStorage so the first render already
// knows whether the user is signed in — eliminates the "guest → skeleton →
// dashboard" flash on every page load.
const readCachedSession = (): Session | null => {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!url || typeof window === "undefined") return null;
    const ref = url.match(/https?:\/\/([^.]+)\./)?.[1];
    if (!ref) return null;
    const raw = window.localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session: Session | null = parsed?.currentSession ?? parsed ?? null;
    if (!session?.access_token) return null;
    if (session.expires_at && session.expires_at * 1000 < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const cached = typeof window !== "undefined" ? readCachedSession() : null;
  const [user, setUser] = useState<User | null>(cached?.user ?? null);
  const [session, setSession] = useState<Session | null>(cached);
  // If we have a cached session (or definitively no token), we can render
  // immediately without a loading flash. Only stay in loading state if we
  // truly don't know yet (shouldn't happen with the sync read above).
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Reconcile with the real session in the background.
    supabase.auth.getSession().then(({ data: { session: fresh } }) => {
      if (!isMounted) return;
      setSession(fresh);
      setUser((prev) => {
        const next = fresh?.user ?? null;
        if (prev?.id === next?.id) return prev;
        return next;
      });
      setLoading(false);
    }).catch((error) => {
      console.error("Error getting session:", error);
      if (isMounted) setLoading(false);
    });

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        // Ignore benign token refreshes that fire on tab focus. Without
        // this, a new `user` object reference cascades through downstream
        // hooks (useAdmin, useUserStatus) which flip back to loading, and
        // ProtectedRoute unmounts the current page — wiping in-page state
        // like open dialogs / quiz progress.
        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          setSession(newSession);
          setLoading(false);
          return;
        }
        setSession(newSession);
        setUser((prev) => {
          const nextUser = newSession?.user ?? null;
          if (prev?.id === nextUser?.id) return prev;
          return nextUser;
        });
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Clear local state first, regardless of server response
    setUser(null);
    setSession(null);
    
    // Then attempt server-side logout (ignore errors like "session not found")
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Ignore signout errors - local state is already cleared
      console.log("Signout completed (session may have already expired)");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
