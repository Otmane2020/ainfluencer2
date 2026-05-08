import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useIsAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const resolveAdmin = async () => {
      if (authLoading) return;

      setLoading(true);

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "support"])
        .limit(1);

      if (!mounted) return;

      if (error) console.error("useIsAdmin error", error);
      setIsAdmin((data?.length ?? 0) > 0);
      setLoading(false);
    };

    void resolveAdmin();

    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  return { isAdmin: isAdmin === true, loading: loading || authLoading };
}
