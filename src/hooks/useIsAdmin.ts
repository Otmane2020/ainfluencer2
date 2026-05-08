import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const resolveAdmin = async () => {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (authError || !user) {
        if (authError) console.error("useIsAdmin auth error", authError);
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void resolveAdmin();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin: isAdmin === true, loading };
}
