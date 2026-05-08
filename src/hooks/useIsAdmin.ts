import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useIsAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (authLoading) return;
    if (!user) {
      if (mounted) { setIsAdmin(false); setLoading(false); }
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "support"]);
      if (mounted) {
        if (error) console.error("useIsAdmin error", error);
        setIsAdmin((data?.length ?? 0) > 0);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, authLoading]);

  return { isAdmin, loading: loading || authLoading };
}
