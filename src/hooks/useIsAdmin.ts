import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (mounted) { setIsAdmin(false); setLoading(false); } return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "support"]);
      if (mounted) {
        setIsAdmin((data?.length ?? 0) > 0);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { isAdmin, loading };
}
