import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.id === userId) {
      const displayName = (currentUser.user_metadata?.full_name ?? currentUser.user_metadata?.name ?? currentUser.email?.split("@")[0] ?? "") || null;
      const avatarUrl = currentUser.user_metadata?.avatar_url ?? currentUser.user_metadata?.picture ?? null;
      const { data: inserted } = await supabase
        .from("profiles")
        .insert({ user_id: userId, display_name: displayName, avatar_url: avatarUrl })
        .select()
        .single();
      if (inserted) setProfile(inserted as Profile);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error && (String(error.message).includes("Refresh Token") || String(error.message).includes("Invalid"))) {
          supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchProfile(session.user.id);
          }
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    isLoading,
    signOut,
  }), [user, session, profile, isLoading]);

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
